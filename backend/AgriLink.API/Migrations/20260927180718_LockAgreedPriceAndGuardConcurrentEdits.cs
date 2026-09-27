using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriLink.API.Migrations
{
    /// <inheritdoc />
    public partial class LockAgreedPriceAndGuardConcurrentEdits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "EmailIndex",
                table: "AspNetUsers");

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerUnit",
                table: "PurchaseRequests",
                type: "numeric(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "PurchaseRequests",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerUnit",
                table: "Orders",
                type: "numeric(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "Orders",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "HarvestListings",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            // Backfill the new agreed prices. A request's is the best record there is of what the buyer
            // saw: its listing's current price. An order's is what it actually charged. The xmin
            // "columns" above are Postgres's own system column, so they need no backfill (and no SQL).
            migrationBuilder.Sql(
                """
                UPDATE "PurchaseRequests" AS pr
                SET "PricePerUnit" = hl."PricePerUnit"
                FROM "HarvestListings" AS hl
                WHERE pr."HarvestId" = hl."HarvestId";

                UPDATE "Orders"
                SET "PricePerUnit" = ROUND("TotalAmount" / "TotalQuantity", 2)
                WHERE "TotalQuantity" > 0;
                """);

            // Dropped and recreated above as unique. Fails if two accounts already share an email,
            // which a read-only check found no case of in production.
            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "EmailIndex",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "PricePerUnit",
                table: "PurchaseRequests");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "PurchaseRequests");

            migrationBuilder.DropColumn(
                name: "PricePerUnit",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "HarvestListings");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");
        }
    }
}
