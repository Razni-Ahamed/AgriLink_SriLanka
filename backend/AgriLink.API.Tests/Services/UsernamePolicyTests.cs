using AgriLink.API.Services.Accounts;

namespace AgriLink.API.Tests.Services;

public class UsernamePolicyTests
{
    [Theory]
    [InlineData("abc")]
    [InlineData("nimal.perera")]
    [InlineData("nimal_perera")]
    [InlineData("farmer42")]
    [InlineData("a.b_c.d")]
    [InlineData("123")]
    [InlineData("abcdefghijabcdefghijabcdefghij")] // exactly 30
    public void Check_ValidUsernames_AreAccepted(string username)
    {
        Assert.Equal(UsernameCheck.Valid, UsernamePolicy.Check(username));
    }

    [Theory]
    [InlineData("")]
    [InlineData("ab")] // too short
    [InlineData("abcdefghijabcdefghijabcdefghijk")] // 31
    [InlineData(".nimal")] // leading dot
    [InlineData("nimal.")] // trailing dot
    [InlineData("_nimal")] // leading underscore
    [InlineData("nimal_")] // trailing underscore
    [InlineData("nimal..perera")] // double dot
    [InlineData("nimal perera")] // space
    [InlineData("nimal-perera")] // dash
    [InlineData("nimal@perera")]
    [InlineData("Nimal")] // not normalized: uppercase is never valid on its own
    [InlineData("නිමල්")] // Sinhala script
    [InlineData("abc\n")]
    [InlineData("../etc")]
    public void Check_InvalidUsernames_AreRejected(string username)
    {
        Assert.Equal(UsernameCheck.Invalid, UsernamePolicy.Check(username));
    }

    [Theory]
    [InlineData("admin")]
    [InlineData("administrator")]
    [InlineData("agrilink")]
    [InlineData("support")]
    [InlineData("system")]
    [InlineData("root")]
    [InlineData("officer")]
    [InlineData("farmer")]
    [InlineData("buyer")]
    [InlineData("null")]
    [InlineData("undefined")]
    [InlineData("api")]
    [InlineData("help")]
    public void Check_ReservedNames_AreRefused(string username)
    {
        Assert.Equal(UsernameCheck.Reserved, UsernamePolicy.Check(username));
    }

    [Fact]
    public void Check_Me_IsReservedEvenThoughItIsShort()
    {
        // "me" is two characters, so it's already invalid by length; either way it must not pass.
        Assert.NotEqual(UsernameCheck.Valid, UsernamePolicy.Check("me"));
    }

    [Theory]
    [InlineData("  Nimal.Perera  ", "nimal.perera")]
    [InlineData("ADMIN", "admin")]
    [InlineData(null, "")]
    public void Normalize_TrimsAndLowercases(string? input, string expected)
    {
        Assert.Equal(expected, UsernamePolicy.Normalize(input));
    }

    [Fact]
    public void Normalize_ThenCheck_ReservedNameInUppercaseIsStillReserved()
    {
        Assert.Equal(UsernameCheck.Reserved, UsernamePolicy.Check(UsernamePolicy.Normalize(" Admin ")));
    }

    [Fact]
    public void NextChangeAllowedAt_NeverChanged_IsNull()
    {
        Assert.Null(UsernamePolicy.NextChangeAllowedAt(null, DateTime.UtcNow));
    }

    [Fact]
    public void NextChangeAllowedAt_ChangedRecently_Is30DaysLater()
    {
        var now = new DateTime(2026, 9, 22, 12, 0, 0, DateTimeKind.Utc);
        var changed = now.AddDays(-10);

        Assert.Equal(changed.AddDays(30), UsernamePolicy.NextChangeAllowedAt(changed, now));
    }

    [Fact]
    public void NextChangeAllowedAt_ChangedMoreThan30DaysAgo_IsNull()
    {
        var now = new DateTime(2026, 9, 22, 12, 0, 0, DateTimeKind.Utc);

        Assert.Null(UsernamePolicy.NextChangeAllowedAt(now.AddDays(-31), now));
    }

    [Theory]
    [InlineData("Nimal Perera", "nimal.perera")]
    [InlineData("  Kumari   Jayasinghe ", "kumari.jayasinghe")]
    [InlineData("José Fernando", "jose.fernando")]
    [InlineData("R. M. Bandara", "r.m.bandara")]
    [InlineData("O'Neil-Silva", "o.neil.silva")]
    [InlineData("Abcdefghij Klmnopqrst Uvwxyzabcd Efgh", "abcdefghij.klmnopqrst.uvwxyzab")]
    [InlineData("නිමල් පෙරේරා", "")] // nothing usable: the caller falls back to "user"
    [InlineData("Al", "")] // too short to be a username on its own
    public void BaseFromFullName_BuildsADottedLowercaseName(string fullName, string expected)
    {
        var result = UsernameGenerator.BaseFromFullName(fullName);

        Assert.Equal(expected, result);
        if (result.Length > 0)
        {
            Assert.NotEqual(UsernameCheck.Invalid, UsernamePolicy.Check(result));
        }
    }

    [Fact]
    public void BaseFromFullName_TruncationNeverLeavesATrailingDot()
    {
        // 29 letters, then a separator falls exactly on the 30-character cut.
        var result = UsernameGenerator.BaseFromFullName(new string('a', 29) + " bcd");

        Assert.Equal(new string('a', 29), result);
    }
}
