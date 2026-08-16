namespace AgriLink.API.Models;

public class BuyerProfile
{
    public int BuyerProfileId { get; set; }
    public int UserId { get; set; }
    public string BusinessName { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;

    public ApplicationUser User { get; set; } = null!;
}
