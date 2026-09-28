using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Notifications;

public class SendNotificationRequest
{
    public int UserId { get; set; }

    // Matches the Notifications.Title column (varchar(150)); a longer title used to reach the
    // database and come back as a 500.
    [Required(AllowEmptyStrings = false), MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false), MaxLength(2000)]
    public string Message { get; set; } = string.Empty;
}
