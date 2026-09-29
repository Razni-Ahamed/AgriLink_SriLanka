using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriLink.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditTimestamps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "PurchaseRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "HarvestListings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Fields",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Fields",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Farms",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Departments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Crops",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Crops",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "CropIssues",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "AspNetUsers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "AIAdvisories",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "AIAdvisories",
                type: "timestamp with time zone",
                nullable: true);

            // Existing rows take their parent's creation time rather than the moment this ran: a
            // field and its crops from the farm, an advisory from the issue it was drafted for.
            // The temporary default then goes, so new rows always get the app's own timestamp.
            migrationBuilder.Sql("""
                UPDATE "Fields" f SET "CreatedAt" = fa."CreatedAt" FROM "Farms" fa WHERE fa."FarmId" = f."FarmId";
                UPDATE "Crops" c SET "CreatedAt" = f."CreatedAt" FROM "Fields" f WHERE f."FieldId" = c."FieldId";
                UPDATE "AIAdvisories" a SET "CreatedAt" = i."CreatedAt" FROM "CropIssues" i WHERE i."IssueId" = a."IssueId";
                ALTER TABLE "Fields" ALTER COLUMN "CreatedAt" DROP DEFAULT;
                ALTER TABLE "Crops" ALTER COLUMN "CreatedAt" DROP DEFAULT;
                ALTER TABLE "AIAdvisories" ALTER COLUMN "CreatedAt" DROP DEFAULT;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "PurchaseRequests");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "HarvestListings");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Fields");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Fields");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Farms");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Crops");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Crops");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "CropIssues");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "AIAdvisories");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "AIAdvisories");
        }
    }
}
