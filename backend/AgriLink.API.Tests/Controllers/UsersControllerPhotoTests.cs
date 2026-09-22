using AgriLink.API.DTOs.Auth;
using AgriLink.API.DTOs.Users;
using AgriLink.API.Services.Images;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using SkiaSharp;
using static AgriLink.API.Tests.Controllers.UsersControllerTests;

namespace AgriLink.API.Tests.Controllers;

/// <summary>
/// Uploading and removing a profile photo: the new photo is saved before the old one is deleted,
/// a storage outage fails cleanly, and nothing but a real, decodable image ever reaches storage.
/// </summary>
public class UsersControllerPhotoTests
{
    private const string NewKey = "agrilink/avatars/new";
    private const string NewUrl = "https://res.cloudinary.com/demo/image/upload/agrilink/avatars/new.jpg";
    private const string OldKey = "agrilink/avatars/old";
    private const string OldUrl = "https://res.cloudinary.com/demo/image/upload/agrilink/avatars/old.jpg";

    private readonly Mock<IProfilePhotoStorage> _storage = new();

    public UsersControllerPhotoTests()
    {
        _storage
            .Setup(s => s.SaveAsync(It.IsAny<byte[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StoredProfilePhoto(NewKey, NewUrl));
    }

    private static UploadProfilePhotoRequest Upload(byte[] bytes, long? reportedLength = null) => new()
    {
        Photo = new FormFile(new MemoryStream(bytes), 0, reportedLength ?? bytes.Length, "photo", "me.png"),
    };

    private static byte[] PngPhoto(int size = 300)
    {
        using var bitmap = new SKBitmap(size, size);
        bitmap.Erase(SKColors.ForestGreen);
        using var data = bitmap.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }

    [Fact]
    public async Task UploadPhoto_StoresAProcessedJpeg_SavesTheUrl_ThenDeletesTheOldPhoto()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "farmer@agrilink.lk", "Farmer One", "Farmer");
        user.ProfilePhotoUrl = OldUrl;
        user.ProfilePhotoKey = OldKey;
        await db.SaveChangesAsync();
        var stampBefore = user.SecurityStamp;
        var controller = BuildController(db, users, user.Id, "Farmer", photoStorage: _storage.Object);

        var result = await controller.UploadPhoto(Upload(PngPhoto()));

        var profile = Assert.IsType<UserProfileResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(NewUrl, profile.ProfilePhotoUrl);

        // Only the processed JPEG is stored, never the raw upload.
        _storage.Verify(s => s.SaveAsync(It.Is<byte[]>(b => b[0] == 0xFF && b[1] == 0xD8), It.IsAny<CancellationToken>()), Times.Once);
        _storage.Verify(s => s.DeleteAsync(OldKey, It.IsAny<CancellationToken>()), Times.Once);

        var saved = await db.Users.AsNoTracking().SingleAsync(u => u.Id == user.Id);
        Assert.Equal(NewUrl, saved.ProfilePhotoUrl);
        Assert.Equal(NewKey, saved.ProfilePhotoKey);
        Assert.Equal(stampBefore, saved.SecurityStamp);

        var audit = await db.AuditLogs.SingleAsync(a => a.Action == "ProfilePhotoChanged");
        Assert.Equal(user.Id, audit.UserId);
        Assert.Equal(OldUrl, audit.OldValue);
        Assert.Equal(NewUrl, audit.NewValue);
    }

    [Fact]
    public async Task UploadPhoto_OldPhotoDeleteFails_StillSucceeds()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "farmer@agrilink.lk", "Farmer One", "Farmer");
        user.ProfilePhotoUrl = OldUrl;
        user.ProfilePhotoKey = OldKey;
        await db.SaveChangesAsync();
        _storage
            .Setup(s => s.DeleteAsync(OldKey, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ImageStorageException("Cloudinary is down."));
        var controller = BuildController(db, users, user.Id, "Farmer", photoStorage: _storage.Object);

        var result = await controller.UploadPhoto(Upload(PngPhoto()));

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(NewUrl, (await db.Users.AsNoTracking().SingleAsync(u => u.Id == user.Id)).ProfilePhotoUrl);
    }

    [Fact]
    public async Task UploadPhoto_FirstPhoto_DeletesNothing()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "buyer@agrilink.lk", "Buyer One", "Buyer");
        var controller = BuildController(db, users, user.Id, "Buyer", photoStorage: _storage.Object);

        Assert.IsType<OkObjectResult>((await controller.UploadPhoto(Upload(PngPhoto()))).Result);
        _storage.Verify(s => s.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UploadPhoto_StorageOutage_Returns503_AndLeavesTheAccountUnchanged()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "farmer@agrilink.lk", "Farmer One", "Farmer");
        user.ProfilePhotoUrl = OldUrl;
        user.ProfilePhotoKey = OldKey;
        await db.SaveChangesAsync();
        _storage
            .Setup(s => s.SaveAsync(It.IsAny<byte[]>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ImageStorageException("Cloudinary is down."));
        var controller = BuildController(db, users, user.Id, "Farmer", photoStorage: _storage.Object);

        var result = await controller.UploadPhoto(Upload(PngPhoto()));

        Assert.Equal(StatusCodes.Status503ServiceUnavailable, Assert.IsType<ObjectResult>(result.Result).StatusCode);
        var saved = await db.Users.AsNoTracking().SingleAsync(u => u.Id == user.Id);
        Assert.Equal(OldUrl, saved.ProfilePhotoUrl);
        Assert.Equal(OldKey, saved.ProfilePhotoKey);
        _storage.Verify(s => s.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Empty(db.AuditLogs);
    }

    [Fact]
    public async Task UploadPhoto_NotAnImage_Returns400_AndNeverTouchesStorage()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "farmer@agrilink.lk", "Farmer One", "Farmer");
        var controller = BuildController(db, users, user.Id, "Farmer", photoStorage: _storage.Object);

        var result = await controller.UploadPhoto(Upload("<svg onload=alert(1)>"u8.ToArray()));

        Assert.IsType<BadRequestObjectResult>(result.Result);
        _storage.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UploadPhoto_TooSmall_Returns400()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "farmer@agrilink.lk", "Farmer One", "Farmer");
        var controller = BuildController(db, users, user.Id, "Farmer", photoStorage: _storage.Object);

        var result = await controller.UploadPhoto(Upload(PngPhoto(size: 64)));

        Assert.IsType<BadRequestObjectResult>(result.Result);
        _storage.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UploadPhoto_OverFiveMegabytes_IsRefusedBeforeTheBodyIsRead()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "farmer@agrilink.lk", "Farmer One", "Farmer");
        var controller = BuildController(db, users, user.Id, "Farmer", photoStorage: _storage.Object);
        // The stream is empty: if the controller tried to read it, processing would fail differently.
        var request = Upload(Array.Empty<byte>(), reportedLength: ProfilePhotoProcessor.MaxUploadBytes + 1);

        var result = await controller.UploadPhoto(request);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Contains("5 MB", badRequest.Value!.ToString());
        _storage.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UploadPhoto_NoFile_Returns400()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "farmer@agrilink.lk", "Farmer One", "Farmer");
        var controller = BuildController(db, users, user.Id, "Farmer", photoStorage: _storage.Object);

        Assert.IsType<BadRequestObjectResult>((await controller.UploadPhoto(new UploadProfilePhotoRequest())).Result);
    }

    [Fact]
    public async Task DeletePhoto_ClearsTheUrl_DeletesFromStorage_AndAudits()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "officer@agrilink.lk", "Officer One", "Officer");
        user.ProfilePhotoUrl = OldUrl;
        user.ProfilePhotoKey = OldKey;
        await db.SaveChangesAsync();
        var controller = BuildController(db, users, user.Id, "Officer", photoStorage: _storage.Object);

        var result = await controller.DeletePhoto();

        var profile = Assert.IsType<UserProfileResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Null(profile.ProfilePhotoUrl);
        var saved = await db.Users.AsNoTracking().SingleAsync(u => u.Id == user.Id);
        Assert.Null(saved.ProfilePhotoUrl);
        Assert.Null(saved.ProfilePhotoKey);
        _storage.Verify(s => s.DeleteAsync(OldKey, It.IsAny<CancellationToken>()), Times.Once);
        Assert.Single(db.AuditLogs, a => a.Action == "ProfilePhotoRemoved" && a.UserId == user.Id);
    }

    [Fact]
    public async Task DeletePhoto_WithNoPhoto_IsANoOp()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "officer@agrilink.lk", "Officer One", "Officer");
        var controller = BuildController(db, users, user.Id, "Officer", photoStorage: _storage.Object);

        Assert.IsType<OkObjectResult>((await controller.DeletePhoto()).Result);
        _storage.VerifyNoOtherCalls();
        Assert.Empty(db.AuditLogs);
    }

    [Fact]
    public async Task DeletePhoto_OnlyEverTouchesTheCallersOwnAccount()
    {
        var (db, users) = await CreateAsync();
        var caller = await CreateUserAsync(users, "farmer@agrilink.lk", "Farmer One", "Farmer");
        var other = await CreateUserAsync(users, "buyer@agrilink.lk", "Buyer One", "Buyer");
        other.ProfilePhotoUrl = OldUrl;
        other.ProfilePhotoKey = OldKey;
        await db.SaveChangesAsync();
        var controller = BuildController(db, users, caller.Id, "Farmer", photoStorage: _storage.Object);

        await controller.DeletePhoto();

        Assert.Equal(OldUrl, (await db.Users.AsNoTracking().SingleAsync(u => u.Id == other.Id)).ProfilePhotoUrl);
        _storage.VerifyNoOtherCalls();
    }
}
