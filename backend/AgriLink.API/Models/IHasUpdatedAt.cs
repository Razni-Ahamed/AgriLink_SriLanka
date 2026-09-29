namespace AgriLink.API.Models;

/// <summary>
/// A record with an UpdatedAt audit field. AgriLinkDbContext stamps it on every save that changes
/// the record, so no controller has to remember to; it stays null until the first change.
/// </summary>
public interface IHasUpdatedAt
{
    DateTime? UpdatedAt { get; set; }
}
