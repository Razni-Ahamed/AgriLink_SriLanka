using AgriLink.API.Controllers;
using AgriLink.API.Services.Images;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace AgriLink.API.Tests.Services;

public sealed class LocalProfilePhotoStorageTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "agrilink-avatar-tests", Guid.NewGuid().ToString("N"));
    private readonly LocalProfilePhotoStorage _storage;

    public LocalProfilePhotoStorageTests()
    {
        var context = new DefaultHttpContext();
        context.Request.Scheme = "https";
        context.Request.Host = new HostString("localhost:7205");
        _storage = new LocalProfilePhotoStorage(_root, Mock.Of<IHttpContextAccessor>(a => a.HttpContext == context));
    }

    public void Dispose()
    {
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }

    private ProfilePhotosController Controller(IProfilePhotoStorage? storage = null) => new(storage ?? _storage)
    {
        ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
    };

    [Fact]
    public async Task SaveAsync_PicksARandomFileName_AndReturnsAnAbsoluteServeUrl()
    {
        var stored = await _storage.SaveAsync(new byte[] { 1, 2, 3 }, CancellationToken.None);

        Assert.Matches(@"^[0-9a-f]{32}\.jpg$", stored.Key);
        Assert.Equal($"https://localhost:7205/api/profile-photos/{stored.Key}", stored.Url);
        Assert.Equal(new byte[] { 1, 2, 3 }, await File.ReadAllBytesAsync(Path.Combine(_root, stored.Key)));
    }

    [Fact]
    public async Task DeleteAsync_RemovesTheFile_AndIgnoresAMissingOne()
    {
        var stored = await _storage.SaveAsync(new byte[] { 1 }, CancellationToken.None);

        await _storage.DeleteAsync(stored.Key, CancellationToken.None);
        await _storage.DeleteAsync(stored.Key, CancellationToken.None);

        Assert.False(File.Exists(Path.Combine(_root, stored.Key)));
    }

    [Fact]
    public async Task DeleteAsync_KeyOutsideTheAllowedShape_IsRefused()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _storage.DeleteAsync("../appsettings.json", CancellationToken.None));
    }

    [Fact]
    public async Task Get_StoredPhoto_IsServedAsJpegWithNoSniff()
    {
        var stored = await _storage.SaveAsync(new byte[] { 0xFF, 0xD8, 0xFF }, CancellationToken.None);
        var controller = Controller();

        var result = Assert.IsType<PhysicalFileResult>(controller.Get(stored.Key));

        Assert.Equal("image/jpeg", result.ContentType);
        Assert.Equal(Path.Combine(_root, stored.Key), result.FileName);
        Assert.Equal("nosniff", controller.Response.Headers.XContentTypeOptions.ToString());
    }

    [Theory]
    [InlineData("../x")]
    [InlineData("..\\x")]
    [InlineData("../../appsettings.json")]
    [InlineData("a.png")]
    [InlineData("0123456789abcdef0123456789abcdef.png")]
    [InlineData("0123456789ABCDEF0123456789ABCDEF.jpg")] // uppercase hex
    [InlineData("0123456789abcdef0123456789abcde.jpg")] // 31 characters
    [InlineData("0123456789abcdef0123456789abcdef.jpg/../../x")]
    [InlineData("0123456789abcdef0123456789abcdef.jpg\n")]
    [InlineData("/etc/passwd")]
    [InlineData("C:\\Windows\\win.ini")]
    [InlineData("")]
    public async Task Get_NameNotInTheExactStoredShape_Is404_EvenWhenAFileExists(string fileName)
    {
        // A real file sits in the folder, so a 404 here can only come from the name check.
        await _storage.SaveAsync(new byte[] { 1 }, CancellationToken.None);
        File.WriteAllBytes(Path.Combine(_root, "a.png"), new byte[] { 1 });

        Assert.IsType<NotFoundResult>(Controller().Get(fileName));
    }

    [Fact]
    public void Get_WellFormedNameThatWasNeverStored_Is404()
    {
        Assert.IsType<NotFoundResult>(Controller().Get("0123456789abcdef0123456789abcdef.jpg"));
    }

    [Fact]
    public void Get_WhenPhotosAreOnCloudinary_EverythingIs404()
    {
        var controller = Controller(Mock.Of<IProfilePhotoStorage>());

        Assert.IsType<NotFoundResult>(controller.Get("0123456789abcdef0123456789abcdef.jpg"));
    }
}
