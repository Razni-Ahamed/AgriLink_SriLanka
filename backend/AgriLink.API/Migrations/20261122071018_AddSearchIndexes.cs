using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriLink.API.Migrations
{
    /// <summary>
    /// Indexes for the case-insensitive marketplace and issue searches and filters, which compare
    /// lower(column). EF can't describe indexes on an expression, so they are created here in SQL
    /// and are not in the model snapshot.
    /// </summary>
    public partial class AddSearchIndexes : Migration
    {
        // "contains" searches: lower(column) LIKE '%term%'. Trigram GIN indexes serve these for
        // terms of three or more characters.
        private static readonly (string Name, string Table, string Column)[] TrigramIndexes =
        {
            ("IX_Crops_CropType_Trgm", "Crops", "CropType"),
            ("IX_Crops_Variety_Trgm", "Crops", "Variety"),
            ("IX_Farms_District_Trgm", "Farms", "District"),
            ("IX_HarvestListings_Location_Trgm", "HarvestListings", "Location"),
            ("IX_CropIssues_Title_Trgm", "CropIssues", "Title"),
            ("IX_CropIssues_Description_Trgm", "CropIssues", "Description"),
            ("IX_AspNetUsers_FullName_Trgm", "AspNetUsers", "FullName"),
        };

        // Exact filters: lower(column) = lower(value), e.g. the crop type and district filters
        // and the price guide.
        private static readonly (string Name, string Table, string Column)[] LowerIndexes =
        {
            ("IX_Crops_CropType_Lower", "Crops", "CropType"),
            ("IX_Farms_District_Lower", "Farms", "District"),
        };

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:pg_trgm", ",,");

            foreach (var (name, table, column) in TrigramIndexes)
            {
                migrationBuilder.Sql(
                    $"CREATE INDEX IF NOT EXISTS \"{name}\" ON \"{table}\" USING gin (lower(\"{column}\") gin_trgm_ops);");
            }

            foreach (var (name, table, column) in LowerIndexes)
            {
                migrationBuilder.Sql(
                    $"CREATE INDEX IF NOT EXISTS \"{name}\" ON \"{table}\" (lower(\"{column}\"));");
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var (name, _, _) in TrigramIndexes.Concat(LowerIndexes))
            {
                migrationBuilder.Sql($"DROP INDEX IF EXISTS \"{name}\";");
            }

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:pg_trgm", ",,");
        }
    }
}
