using Microsoft.Extensions.Options;

namespace AgriLink.API.Services.Sms;

/// <summary>
/// Decides whether an alert may be texted, so no one account can run up the SMS bill or flood a
/// phone: at most <see cref="SmsOptions.MaxPerUserPerDay"/> texts per user in any 24 hours, and
/// a repeat of the same alert (same user, kind and subject) only after
/// <see cref="SmsOptions.RepeatCooldownMinutes"/>. Skipped alerts still reach the user in the app.
///
/// Counts live in memory, like the request rate limiter: they reset when the API restarts, which
/// is fine for a cap meant to stop floods rather than to bill exactly.
/// </summary>
public sealed class SmsSendLimiter
{
    private static readonly TimeSpan Day = TimeSpan.FromDays(1);

    private readonly int _maxPerDay;
    private readonly TimeSpan _cooldown;
    private readonly TimeProvider _time;
    private readonly object _lock = new();
    private readonly Dictionary<int, Queue<DateTimeOffset>> _sentByUser = new();
    private readonly Dictionary<(int UserId, SmsAlertKind Kind, string Subject), DateTimeOffset> _lastByAlert = new();

    public SmsSendLimiter(IOptions<SmsOptions> options, TimeProvider? time = null)
    {
        _maxPerDay = options.Value.MaxPerUserPerDay;
        _cooldown = TimeSpan.FromMinutes(Math.Max(0, options.Value.RepeatCooldownMinutes));
        _time = time ?? TimeProvider.System;
    }

    /// <summary>
    /// True if this alert may be sent now, and counts it as sent. False if the user hit the daily
    /// cap or got the same alert too recently.
    /// </summary>
    public bool TryAcquire(int userId, SmsAlert alert)
    {
        var now = _time.GetUtcNow();
        var key = (userId, alert.Kind, alert.Subject.Trim().ToLowerInvariant());

        lock (_lock)
        {
            Prune(now);

            if (_cooldown > TimeSpan.Zero && _lastByAlert.TryGetValue(key, out var last) && now - last < _cooldown)
            {
                return false;
            }

            if (!_sentByUser.TryGetValue(userId, out var sent))
            {
                sent = new Queue<DateTimeOffset>();
                _sentByUser[userId] = sent;
            }

            if (_maxPerDay > 0 && sent.Count >= _maxPerDay)
            {
                return false;
            }

            sent.Enqueue(now);
            _lastByAlert[key] = now;
            return true;
        }
    }

    // Drops what can no longer affect a decision, so memory stays bounded by a day's traffic.
    private void Prune(DateTimeOffset now)
    {
        foreach (var (userId, sent) in _sentByUser.ToList())
        {
            while (sent.Count > 0 && now - sent.Peek() >= Day)
            {
                sent.Dequeue();
            }

            if (sent.Count == 0)
            {
                _sentByUser.Remove(userId);
            }
        }

        foreach (var (key, at) in _lastByAlert.ToList())
        {
            if (now - at >= _cooldown)
            {
                _lastByAlert.Remove(key);
            }
        }
    }
}
