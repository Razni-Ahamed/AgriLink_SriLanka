namespace AgriLink.API.Models;

public class BuyerProfile
{
    public int BuyerProfileId { get; set; }
    public int UserId { get; set; }
    public string BusinessName { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string? BusinessRegistrationNumber { get; set; }
    public string? BusinessPhone { get; set; }
    public string? NIC { get; set; }

    public ApplicationUser User { get; set; } = null!;
}
