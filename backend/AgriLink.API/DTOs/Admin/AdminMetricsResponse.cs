namespace AgriLink.API.DTOs.Admin;

public class AdminMetricsResponse
{
    public int TotalUsers { get; set; }
    public int TotalFarms { get; set; }
    public int TotalCrops { get; set; }
    public int IssuesReported { get; set; }
    public int IssuesResolved { get; set; }
    public decimal HarvestVolumeSoldThisMonth { get; set; }
}
