namespace AgriLink.API.Services.Sms;

/// <summary>One SMS gateway. Add another provider by implementing this and choosing it in Program.cs.</summary>
public interface ISmsSender
{
    /// <summary>False when the gateway's settings are incomplete, so it can't send.</summary>
    bool IsConfigured { get; }

    /// <summary>
    /// Sends one message to a number in international form without the plus (94771234567).
    /// Returns false when the gateway refused it; throws only for network failures and timeouts.
    /// </summary>
    Task<bool> SendAsync(string internationalNumber, string text, CancellationToken cancellationToken);
}

/// <summary>The sender used when no gateway is configured: it never sends anything.</summary>
public sealed class NullSmsSender : ISmsSender
{
    public bool IsConfigured => false;

    public Task<bool> SendAsync(string internationalNumber, string text, CancellationToken cancellationToken) =>
        Task.FromResult(false);
}
