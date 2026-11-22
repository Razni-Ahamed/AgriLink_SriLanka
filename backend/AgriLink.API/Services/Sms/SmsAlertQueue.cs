using System.Threading.Channels;
using Microsoft.Extensions.Options;

namespace AgriLink.API.Services.Sms;

public interface ISmsAlertQueue
{
    /// <summary>
    /// Queues an alert for <see cref="SmsAlertDispatcher"/> and returns at once, so a slow or
    /// broken gateway never slows down or fails the request that caused it. Does nothing when SMS
    /// isn't configured.
    /// </summary>
    void Enqueue(int userId, SmsAlert alert);
}

public sealed record QueuedSmsAlert(int UserId, SmsAlert Alert);

public sealed class SmsAlertQueue : ISmsAlertQueue
{
    private readonly Channel<QueuedSmsAlert> _channel;
    private readonly bool _enabled;
    private readonly ILogger<SmsAlertQueue> _logger;

    public SmsAlertQueue(IOptions<SmsOptions> options, ILogger<SmsAlertQueue> logger)
    {
        _enabled = options.Value.IsEnabled;
        _logger = logger;
        _channel = Channel.CreateBounded<QueuedSmsAlert>(new BoundedChannelOptions(Math.Max(1, options.Value.QueueCapacity))
        {
            FullMode = BoundedChannelFullMode.DropWrite,
            SingleReader = true,
        });
    }

    public bool IsEnabled => _enabled;

    public ChannelReader<QueuedSmsAlert> Reader => _channel.Reader;

    public void Enqueue(int userId, SmsAlert alert)
    {
        if (!_enabled)
        {
            return;
        }

        if (!_channel.Writer.TryWrite(new QueuedSmsAlert(userId, alert)))
        {
            _logger.LogWarning("SMS queue is full; dropped a {Kind} alert for user {UserId}", alert.Kind, userId);
        }
    }
}
