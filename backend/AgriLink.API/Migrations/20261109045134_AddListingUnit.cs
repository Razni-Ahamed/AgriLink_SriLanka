using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriLink.API.Migrations
{
    /// <inheritdoc />
    public partial class AddListingUnit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Unit",
                table: "HarvestListings",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                // Every listing before units existed was priced per kg.
                defaultValue: "Kg");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Unit",
                table: "HarvestListings");
        }
    }
}
