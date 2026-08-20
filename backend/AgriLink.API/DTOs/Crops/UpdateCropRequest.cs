using System.ComponentModel.DataAnnotations;
using AgriLink.API.Models;

namespace AgriLink.API.DTOs.Crops;

public class UpdateCropRequest
{
    [Required]
    public CropStatus Status { get; set; }
}
