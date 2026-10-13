using System.Globalization;
using System.IO.Compression;
using System.Text;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Admin;
using AgriLink.API.Services.Agents;
using AgriLink.API.Services.Images;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

/// <summary>
/// The officers' confirmed photo diagnoses, for the admin: how often each model agreed with the
/// officer, and the confirmed photos as a labelled dataset for retraining (field photos from Sri
/// Lankan farms are exactly what the models lack). Only an issue's latest review counts, since a
/// revised review replaces the earlier decision.
/// </summary>
[ApiController]
[Route("api/admin/photo-diagnoses")]
[Authorize(Roles = "Admin")]
public class PhotoDiagnosesController : ControllerBase
{
    private const int TopCorrectionsPerModel = 3;

    private readonly AgriLinkDbContext _db;
    private readonly IImageStorageService _imageStorage;
    private readonly IDiseaseKnowledgeBase _diseases;
    private readonly ILogger<PhotoDiagnosesController> _logger;

    public PhotoDiagnosesController(
        AgriLinkDbContext db,
        IImageStorageService imageStorage,
        IDiseaseKnowledgeBase diseases,
        ILogger<PhotoDiagnosesController> logger)
    {
        _db = db;
        _imageStorage = imageStorage;
        _diseases = diseases;
        _logger = logger;
    }

    private sealed record ConfirmedDiagnosis(
        int IssueId,
        string Crop,
        string District,
        string PredictedKey,
        string ConfirmedKey,
        float? ModelConfidence,
        string ModelVersion,
        DateTime ReviewedAt,
        List<PhotoRef> Photos);

    private sealed record PhotoRef(int ImageId, string StorageKey, string ContentType);

    private async Task<List<ConfirmedDiagnosis>> ConfirmedDiagnosesAsync(CancellationToken cancellationToken)
    {
        var reviewed = await _db.AIAdvisories
            .AsNoTracking()
            .Where(a => a.PredictedDiseaseKey != null && a.ConfirmedDiseaseKey != null && a.ReviewedAt != null)
            .Select(a => new
            {
                a.IssueId,
                a.Issue.Crop.CropType,
                a.Issue.Crop.Field.Farm.District,
                PredictedKey = a.PredictedDiseaseKey!,
                ConfirmedKey = a.ConfirmedDiseaseKey!,
                a.ModelConfidence,
                a.ModelVersion,
                ReviewedAt = a.ReviewedAt!.Value,
                Photos = a.Issue.Images.Select(i => new PhotoRef(i.ImageId, i.StorageKey, i.ContentType)).ToList(),
            })
            .ToListAsync(cancellationToken);

        return reviewed
            .GroupBy(a => a.IssueId)
            .Select(issue => issue.OrderByDescending(a => a.ReviewedAt).First())
            .Select(a => new ConfirmedDiagnosis(
                a.IssueId, a.CropType, a.District, a.PredictedKey, a.ConfirmedKey,
                a.ModelConfidence, a.ModelVersion ?? "unknown", a.ReviewedAt, a.Photos))
            .OrderBy(a => a.Crop).ThenBy(a => a.IssueId)
            .ToList();
    }

    [HttpGet("summary")]
    public async Task<ActionResult<PhotoDiagnosisSummaryResponse>> Summary(CancellationToken cancellationToken)
    {
        var diagnoses = await ConfirmedDiagnosesAsync(cancellationToken);

        var models = diagnoses
            .GroupBy(d => (d.Crop, d.ModelVersion))
            .Select(model =>
            {
                var agreed = model.Count(d => d.ConfirmedKey == d.PredictedKey);
                return new PhotoDiagnosisModelSummary
                {
                    Crop = model.Key.Crop,
                    ModelVersion = model.Key.ModelVersion,
                    Reviewed = model.Count(),
                    Agreed = agreed,
                    AgreementRate = Math.Round((double)agreed / model.Count(), 3),
                    ConfirmedOther = model.Count(d => d.ConfirmedKey == DiseaseKnowledgeEntry.OtherKey),
                    TopCorrections = model
                        .Where(d => d.ConfirmedKey != d.PredictedKey)
                        .GroupBy(d => (d.PredictedKey, d.ConfirmedKey))
                        .OrderByDescending(pair => pair.Count()).ThenBy(pair => pair.Key.PredictedKey)
                        .Take(TopCorrectionsPerModel)
                        .Select(pair => new PhotoDiagnosisCorrection
                        {
                            PredictedKey = pair.Key.PredictedKey,
                            PredictedName = _diseases.DisplayName(model.Key.Crop, pair.Key.PredictedKey),
                            ConfirmedKey = pair.Key.ConfirmedKey,
                            ConfirmedName = _diseases.DisplayName(model.Key.Crop, pair.Key.ConfirmedKey),
                            Count = pair.Count(),
                        })
                        .ToList(),
                };
            })
            .OrderBy(m => m.Crop).ThenBy(m => m.ModelVersion)
            .ToList();

        return Ok(new PhotoDiagnosisSummaryResponse
        {
            TotalReviewed = diagnoses.Count,
            PhotosAvailable = diagnoses.Sum(d => d.Photos.Count),
            Models = models,
        });
    }

    /// <summary>
    /// A .zip of every confirmed photo, filed as <c>&lt;Crop&gt;/&lt;confirmed key&gt;/&lt;issue&gt;-&lt;image&gt;.jpg</c>, with
    /// labels.csv and a README. The ml pipeline reads it as the <c>agrilink-confirmed</c> source.
    /// No farmer names or contact details are included; photos were already re-encoded without
    /// EXIF/GPS data when they were uploaded.
    /// </summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export(CancellationToken cancellationToken)
    {
        var diagnoses = await ConfirmedDiagnosesAsync(cancellationToken);

        // Built in a temporary file rather than in memory (it can hold hundreds of photos); the file
        // deletes itself when the response stream is closed.
        var path = Path.Combine(Path.GetTempPath(), $"agrilink-confirmed-{Guid.NewGuid():N}.zip");
        var file = new FileStream(path, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None, 81920,
            FileOptions.DeleteOnClose | FileOptions.Asynchronous);
        try
        {
            var included = 0;
            var missing = 0;
            using (var zip = new ZipArchive(file, ZipArchiveMode.Create, leaveOpen: true))
            {
                var labels = new StringBuilder(
                    "path,crop,confirmed_key,predicted_key,agreed,model_confidence,model_version,district,reviewed_at,issue_id,image_id\n");

                foreach (var diagnosis in diagnoses)
                {
                    foreach (var photo in diagnosis.Photos)
                    {
                        var entryPath = $"{SafeSegment(diagnosis.Crop)}/{SafeSegment(diagnosis.ConfirmedKey)}/" +
                                        $"{diagnosis.IssueId}-{photo.ImageId}{Extension(photo.ContentType)}";
                        try
                        {
                            await using var source = await _imageStorage.OpenReadAsync(photo.StorageKey, cancellationToken);
                            var entry = zip.CreateEntry(entryPath, CompressionLevel.NoCompression); // JPEGs don't compress
                            await using (var target = entry.Open())
                            {
                                await source.CopyToAsync(target, cancellationToken);
                            }
                        }
                        catch (Exception ex) when (ex is FileNotFoundException or ImageStorageException)
                        {
                            _logger.LogWarning(ex, "Confirmed photo {ImageId} could not be read for the export", photo.ImageId);
                            missing++;
                            continue;
                        }

                        included++;
                        labels.AppendJoin(',',
                            Csv(entryPath), Csv(diagnosis.Crop), Csv(diagnosis.ConfirmedKey), Csv(diagnosis.PredictedKey),
                            diagnosis.ConfirmedKey == diagnosis.PredictedKey ? "true" : "false",
                            diagnosis.ModelConfidence?.ToString("0.####", CultureInfo.InvariantCulture) ?? "",
                            Csv(diagnosis.ModelVersion), Csv(diagnosis.District),
                            diagnosis.ReviewedAt.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture),
                            diagnosis.IssueId.ToString(CultureInfo.InvariantCulture),
                            photo.ImageId.ToString(CultureInfo.InvariantCulture));
                        labels.Append('\n');
                    }
                }

                await WriteTextEntryAsync(zip, "labels.csv", labels.ToString(), cancellationToken);
                await WriteTextEntryAsync(zip, "README.txt", Readme(included, missing), cancellationToken);
            }

            file.Position = 0;
            return File(file, "application/zip", $"agrilink-confirmed-photos-{DateTime.UtcNow:yyyyMMdd}.zip");
        }
        catch
        {
            await file.DisposeAsync();
            throw;
        }
    }

    private static async Task WriteTextEntryAsync(ZipArchive zip, string name, string content, CancellationToken cancellationToken)
    {
        await using var stream = zip.CreateEntry(name, CompressionLevel.Optimal).Open();
        await stream.WriteAsync(Encoding.UTF8.GetBytes(content), cancellationToken);
    }

    private static string Readme(int included, int missing) =>
        $"""
        AgriLink: photos with an agricultural officer's confirmed diagnosis
        Exported {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC. {included} photos.{(missing > 0 ? $" {missing} recorded photos could not be read from storage and are not included." : "")}

        Layout: <Crop>/<confirmed disease key>/<issue id>-<image id>.jpg, with labels.csv listing every photo.
        The keys are the class keys in ml/labels/<crop>.json. "other" means the officer chose a disease the
        model has no class for; the training pipeline skips those photos.

        The labels are officers' decisions from the photo and the farmer's report, not lab tests. Photos
        of one issue share an issue id; the pipeline keeps them in the same split.

        To add these photos to a crop's dataset (from the ml folder):
          .venv/Scripts/python -m agrilink_ml.prepare --crop <crop> --source <existing sources...> --source agrilink-confirmed=<this zip>

        The file contains no farmer names or contact details. Keep it out of Git all the same.
        """.Replace("\r\n", "\n");

    // Crop names and keys come from the catalogue and label files, but a path segment must never be
    // able to climb out of its folder.
    private static string SafeSegment(string value)
    {
        var cleaned = new string(value.Select(c => char.IsLetterOrDigit(c) || c is '_' or '-' or ' ' ? c : '_').ToArray()).Trim();
        return cleaned.Length == 0 ? "unknown" : cleaned;
    }

    private static string Extension(string contentType) => contentType switch
    {
        "image/png" => ".png",
        "image/webp" => ".webp",
        _ => ".jpg",
    };

    private static string Csv(string value) =>
        value.IndexOfAny(new[] { ',', '"', '\n', '\r' }) >= 0 ? $"\"{value.Replace("\"", "\"\"")}\"" : value;
}
