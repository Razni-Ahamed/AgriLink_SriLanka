using System.Text.Json;
using AgriLink.API.Services.Agents;

namespace AgriLink.API.Tests.Agents;

public class DiseaseKnowledgeBaseTests
{
    // ml/labels/*.json is the contract between training and the backend: every class a model can
    // predict must have an entry, or its photos could never be answered or explained.
    public static IEnumerable<object[]> LabelFiles()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !Directory.Exists(Path.Combine(directory.FullName, "ml", "labels")))
        {
            directory = directory.Parent;
        }

        if (directory is null)
        {
            throw new DirectoryNotFoundException("Could not find ml/labels above the test output folder.");
        }

        return Directory.EnumerateFiles(Path.Combine(directory.FullName, "ml", "labels"), "*.json")
            .Select(path => new object[] { path });
    }

    [Theory]
    [MemberData(nameof(LabelFiles))]
    public void EveryClassInEveryLabelFile_HasAnEntry(string labelFile)
    {
        using var labels = JsonDocument.Parse(File.ReadAllText(labelFile));
        var crop = labels.RootElement.GetProperty("crop").GetString()!;
        var knowledgeBase = new DiseaseKnowledgeBase();

        foreach (var labelClass in labels.RootElement.GetProperty("classes").EnumerateArray())
        {
            var key = labelClass.GetProperty("key").GetString()!;
            Assert.True(knowledgeBase.Find(crop, key) is not null, $"{crop} class '{key}' has no DiseaseKnowledgeBase entry.");
        }
    }

    [Fact]
    public void DefaultEntries_NeverAutoReleaseASeriousDiseaseOrOneWithoutTreatment()
    {
        // The shipped defaults stay safe until an officer reviews them: any entry that could be
        // released without an officer must have both a treatment and IsSerious cleared.
        Assert.All(DiseaseKnowledgeBase.DefaultEntries.Where(e => !e.IsHealthy), entry =>
            Assert.True(entry.IsSerious || !string.IsNullOrWhiteSpace(entry.Treatment),
                $"{entry.Key} is not serious but has no treatment."));
    }

    [Fact]
    public void Find_MatchesCropCaseInsensitively_AndKeyExactly()
    {
        var knowledgeBase = new DiseaseKnowledgeBase();

        Assert.NotNull(knowledgeBase.Find(" cassava ", "cassava_mosaic_disease"));
        Assert.Null(knowledgeBase.Find("Cassava", "CASSAVA_MOSAIC_DISEASE"));
        Assert.Null(knowledgeBase.Find("Tomato", "cassava_mosaic_disease"));
    }
}
