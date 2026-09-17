using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Registrations;

public class RejectRegistrationRequest
{
    [Required, MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}
