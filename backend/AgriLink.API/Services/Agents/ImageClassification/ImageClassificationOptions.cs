namespace AgriLink.API.Services.Agents.ImageClassification;

public class ImageClassificationOptions
{
    public const string SectionName = "ImageClassification";

    /// <summary>
    /// Folder holding one subfolder per crop, each with the <c>model.onnx</c> and <c>model.json</c>
    /// written by <c>agrilink_ml.train</c>. Relative paths resolve against the API's content root;
    /// the default points at the repo's <c>ml/models</c>, where training writes them.
    /// </summary>
    public string ModelsDirectory { get; set; } = Path.Combine("..", "..", "ml", "models");

    /// <summary>How long to wait for one photo to be classified before falling back to the
    /// text-only agents.</summary>
    public int TimeoutSeconds { get; set; } = 10;

    /// <summary>CPU threads one classification may use, so a burst of uploads cannot starve the
    /// rest of the API.</summary>
    public int IntraOpThreads { get; set; } = 2;

    /// <summary>
    /// When false, a photo whose triage would allow releasing the stored advice straight to the
    /// farmer is still kept as a Draft for an officer. The API handles Preliminary advisories
    /// (farmer visibility, review queue, confirm/correct); keep this off until the web app shows
    /// preliminary advice as unconfirmed and gives officers the correction form.
    /// </summary>
    public bool AutoReleaseEnabled { get; set; }
}
