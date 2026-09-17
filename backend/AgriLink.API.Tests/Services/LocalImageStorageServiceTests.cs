using AgriLink.API.Services.Images;

namespace AgriLink.API.Tests.Services;

public sealed class LocalImageStorageServiceTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "agrilink-storage-tests", Guid.NewGuid().ToString("N"));
    private readonly LocalImageStorageService _storage;

    public LocalImageStorageServiceTests()
    {
        _storage = new LocalImageStorageService(_root);
    }

    public void Dispose()
    {
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }

    [Fact]
    public async Task SaveAsync_WritesTheFileUnderTheRoot()
    {
        var content = new byte[] { 1, 2, 3 };

        var key = await _storage.SaveAsync(content, "image/jpeg", CancellationToken.None);

        Assert.Matches(@"^issues/[0-9a-f]{32}\.jpg$", key);
        var path = Path.Combine(_root, key.Replace('/', Path.DirectorySeparatorChar));
        Assert.Equal(content, await File.ReadAllBytesAsync(path));
    }

    [Fact]
    public async Task DeleteAsync_RemovesTheFile_AndIgnoresAlreadyDeletedFiles()
    {
        var key = await _storage.SaveAsync(new byte[] { 1 }, "image/jpeg", CancellationToken.None);

        await _storage.DeleteAsync(key, CancellationToken.None);
        await _storage.DeleteAsync(key, CancellationToken.None);

        Assert.False(File.Exists(Path.Combine(_root, key.Replace('/', Path.DirectorySeparatorChar))));
    }

    [Fact]
    public async Task OpenReadAsync_ReturnsTheStoredBytes()
    {
        var content = new byte[] { 9, 8, 7, 6 };
        var key = await _storage.SaveAsync(content, "image/jpeg", CancellationToken.None);

        await using var stream = await _storage.OpenReadAsync(key, CancellationToken.None);
        using var copy = new MemoryStream();
        await stream.CopyToAsync(copy);

        Assert.Equal(content, copy.ToArray());
    }

    [Fact]
    public async Task OpenReadAsync_MissingPhoto_ThrowsFileNotFound()
    {
        await Assert.ThrowsAsync<FileNotFoundException>(
            () => _storage.OpenReadAsync("issues/0123456789abcdef0123456789abcdef.jpg", CancellationToken.None));
    }

    [Theory]
    [InlineData("../outside.jpg")]
    [InlineData("issues/../../outside.jpg")]
    [InlineData("issues/not-a-generated-name.jpg")]
    [InlineData("C:/Windows/win.ini")]
    public async Task DeleteAsync_RejectsKeysItDidNotGenerate(string key)
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _storage.DeleteAsync(key, CancellationToken.None));
    }
}
