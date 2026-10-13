namespace AgriLink.API.DTOs.Admin;

/// <summary>How the photo models' guesses compare with what reviewing officers confirmed.</summary>
public class PhotoDiagnosisSummaryResponse
{
    /// <summary>Reviewed issues with both a model prediction and an officer's confirmed disease.</summary>
    public int TotalReviewed { get; set; }

    /// <summary>Photos the training export would contain.</summary>
    public int PhotosAvailable { get; set; }

    public List<PhotoDiagnosisModelSummary> Models { get; set; } = new();
}

/// <summary>One crop's model version.</summary>
public class PhotoDiagnosisModelSummary
{
    public string Crop { get; set; } = string.Empty;
    public string ModelVersion { get; set; } = string.Empty;
    public int Reviewed { get; set; }

    /// <summary>The officer confirmed the model's own prediction.</summary>
    public int Agreed { get; set; }

    public double AgreementRate { get; set; }

    /// <summary>The officer chose "Other": a disease the model has no class for.</summary>
    public int ConfirmedOther { get; set; }

    /// <summary>The most frequent corrections, most common first (at most three).</summary>
    public List<PhotoDiagnosisCorrection> TopCorrections { get; set; } = new();
}

public class PhotoDiagnosisCorrection
{
    public string PredictedKey { get; set; } = string.Empty;
    public string PredictedName { get; set; } = string.Empty;
    public string ConfirmedKey { get; set; } = string.Empty;
    public string ConfirmedName { get; set; } = string.Empty;
    public int Count { get; set; }
}
