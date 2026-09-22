using System.Collections;

namespace AgriLink.API.Tests.TestSupport;

/// <summary>Reads the anonymous-object error bodies controllers return, without a JSON round trip.</summary>
public static class ResponseBodyHelpers
{
    /// <summary>The <c>code</c> of each item in an Identity-shaped <c>{ errors = [{ code, description }] }</c> body.</summary>
    public static List<string> ErrorCodes(object? body)
    {
        var errors = body?.GetType().GetProperty("errors")?.GetValue(body) as IEnumerable;
        Assert.NotNull(errors);
        return errors!.Cast<object>()
            .Select(e => (string)e.GetType().GetProperty("code")!.GetValue(e)!)
            .ToList();
    }

    /// <summary>The value of a top-level property on an anonymous response body, e.g. <c>message</c>.</summary>
    public static object? Property(object? body, string name) => body?.GetType().GetProperty(name)?.GetValue(body);
}
