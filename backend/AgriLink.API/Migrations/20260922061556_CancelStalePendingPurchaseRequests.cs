using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriLink.API.Migrations
{
    /// <inheritdoc />
    public partial class CancelStalePendingPurchaseRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Data-only backfill, no schema change: before PurchaseRequestsController.Respond and
            // HarvestsController.Update started auto-cancelling stale requests, a Pending request
            // on a listing that sold out, was cancelled, or simply no longer had enough quantity
            // left could stay Pending forever. Close out any request already stuck that way.
            // Status is stored as its enum name (HasConversion<string>() in AgriLinkDbContext), so
            // the string literals here are exactly 'Pending' / 'Active' / 'Cancelled'.
            migrationBuilder.Sql(
                """
                UPDATE "PurchaseRequests" AS pr
                SET "Status" = 'Cancelled'
                FROM "HarvestListings" AS hl
                WHERE pr."HarvestId" = hl."HarvestId"
                  AND pr."Status" = 'Pending'
                  AND (hl."Status" <> 'Active' OR pr."RequestedQuantity" > hl."AvailableQuantity");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op: the backfill can't tell which of these rows were genuinely stale versus
            // which a farmer had simply not gotten to yet, so there is no safe way to restore
            // them all to Pending.
        }
    }
}
