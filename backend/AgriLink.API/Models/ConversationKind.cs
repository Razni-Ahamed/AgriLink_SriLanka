namespace AgriLink.API.Models;

public enum ConversationKind
{
    /// <summary>A farmer and a buyer, about one purchase request (and the order it becomes).</summary>
    Deal,

    /// <summary>A farmer and the agricultural officers of their district, about one crop issue.</summary>
    Advice,
}
