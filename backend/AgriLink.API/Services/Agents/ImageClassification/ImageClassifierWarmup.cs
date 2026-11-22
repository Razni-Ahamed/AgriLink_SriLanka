namespace AgriLink.API.Services.Agents.ImageClassification;

/// <summary>
/// Loads the photo models in the background once the API has started listening, so the first
/// request after a cold start is not held up by model loading and a farmer's first upload still
/// finds them ready. A missing or invalid model is logged by <see cref="OnnxImageClassifier"/>.
/// </summary>
public sealed class ImageClassifierWarmup : BackgroundService
{
    private readonly IImageClassifier _classifier;
    private readonly IHostApplicationLifetime _lifetime;
    private readonly ILogger<ImageClassifierWarmup> _logger;

    public ImageClassifierWarmup(IImageClassifier classifier, IHostApplicationLifetime lifetime, ILogger<ImageClassifierWarmup> logger)
    {
        _classifier = classifier;
        _lifetime = lifetime;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_classifier is not OnnxImageClassifier onnx)
        {
            return;
        }

        // Wait until Kestrel is serving, so loading never competes with start-up itself.
        var started = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using (_lifetime.ApplicationStarted.Register(() => started.TrySetResult()))
        using (stoppingToken.Register(() => started.TrySetCanceled(stoppingToken)))
        {
            try
            {
                await started.Task;
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }

        try
        {
            var watch = System.Diagnostics.Stopwatch.StartNew();
            await Task.Run(onnx.EnsureLoaded, stoppingToken);
            _logger.LogInformation("Image classification models ready after {Elapsed} ms (loaded in the background).", watch.ElapsedMilliseconds);
        }
        catch (OperationCanceledException)
        {
        }
        catch (ObjectDisposedException)
        {
        }
        catch (Exception ex)
        {
            // Never take the API down over the photo models: classification falls back to the text agents.
            _logger.LogError(ex, "Loading the image classification models in the background failed.");
        }
    }
}
