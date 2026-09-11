using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Admin;

public class UpdateUserStatusRequest
{
    [Required]
    public bool IsActive { get; set; }
}
