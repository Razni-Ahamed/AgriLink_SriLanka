using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Accounts;

public class RejectChangeRequestRequest
{
    [Required, MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}
