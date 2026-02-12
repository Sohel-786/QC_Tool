using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class AddDivisionIsolationV2 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Drop old indexes
            migrationBuilder.DropIndex(name: "IX_Items_CategoryId_ItemName_Unique", table: "tools");
            migrationBuilder.DropIndex(name: "IX_ItemCategories_Name_Unique", table: "tool_categories");
            migrationBuilder.DropIndex(name: "IX_Statuses_Name_Unique", table: "statuses");
            migrationBuilder.DropIndex(name: "IX_Machines_ContractorId_Name_Unique", table: "machines");
            migrationBuilder.DropIndex(name: "IX_Locations_CompanyId_Name_Unique", table: "locations");
            migrationBuilder.DropIndex(name: "IX_Contractors_Name_Unique", table: "contractors");
            migrationBuilder.DropIndex(name: "IX_Companies_Name_Unique", table: "companies");

            // 2. Create divisions table
            migrationBuilder.CreateTable(
                name: "divisions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_divisions", x => x.Id);
                });

            // 3. Seed default "QC" division
            migrationBuilder.Sql("INSERT INTO divisions (Name, IsActive, CreatedAt, UpdatedAt) VALUES ('QC', 1, GETDATE(), GETDATE())");

            // 4. Add DivisionId column to all tables (initially nullable)
            string[] tables = { "users", "tools", "tool_categories", "statuses", "returns", "operators", "machines", "locations", "issues", "contractors", "companies" };
            foreach (var table in tables)
            {
                migrationBuilder.AddColumn<int>(
                    name: "DivisionId",
                    table: table,
                    type: "int",
                    nullable: true);
            }

            migrationBuilder.AddColumn<bool>(
                name: "ViewDivisionMaster",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            // 5. Backfill DivisionId = 'QC' for existing records
            foreach (var table in tables)
            {
                migrationBuilder.Sql($"UPDATE {table} SET DivisionId = (SELECT TOP 1 Id FROM divisions WHERE Name = 'QC')");
            }

            // 6. Make DivisionId non-nullable for masters/transactions (except users)
            string[] nonNullableTables = { "tools", "tool_categories", "statuses", "returns", "operators", "machines", "locations", "issues", "contractors", "companies" };
            foreach (var table in nonNullableTables)
            {
                migrationBuilder.AlterColumn<int>(
                    name: "DivisionId",
                    table: table,
                    type: "int",
                    nullable: false);
            }

            // 7. Re-create indexes and foreign keys
            migrationBuilder.CreateIndex(name: "IX_Divisions_Name_Unique", table: "divisions", column: "Name", unique: true);
            migrationBuilder.CreateIndex(name: "IX_users_DivisionId", table: "users", column: "DivisionId");
            migrationBuilder.CreateIndex(name: "IX_Items_Division_CategoryId_ItemName_Unique", table: "tools", columns: new[] { "DivisionId", "categoryId", "toolName" }, unique: true, filter: "[categoryId] IS NOT NULL");
            migrationBuilder.CreateIndex(name: "IX_tools_categoryId", table: "tools", column: "categoryId");
            migrationBuilder.CreateIndex(name: "IX_ItemCategories_Division_Name_Unique", table: "tool_categories", columns: new[] { "DivisionId", "Name" }, unique: true);
            migrationBuilder.CreateIndex(name: "IX_Statuses_Division_Name_Unique", table: "statuses", columns: new[] { "DivisionId", "Name" }, unique: true);
            migrationBuilder.CreateIndex(name: "IX_returns_DivisionId", table: "returns", column: "DivisionId");
            migrationBuilder.CreateIndex(name: "IX_operators_DivisionId", table: "operators", column: "DivisionId");
            migrationBuilder.CreateIndex(name: "IX_machines_ContractorId", table: "machines", column: "ContractorId");
            migrationBuilder.CreateIndex(name: "IX_Machines_Division_ContractorId_Name_Unique", table: "machines", columns: new[] { "DivisionId", "ContractorId", "Name" }, unique: true);
            migrationBuilder.CreateIndex(name: "IX_locations_CompanyId", table: "locations", column: "CompanyId");
            migrationBuilder.CreateIndex(name: "IX_Locations_Division_CompanyId_Name_Unique", table: "locations", columns: new[] { "DivisionId", "CompanyId", "Name" }, unique: true);
            migrationBuilder.CreateIndex(name: "IX_issues_DivisionId", table: "issues", column: "DivisionId");
            migrationBuilder.CreateIndex(name: "IX_Contractors_Division_Name_Unique", table: "contractors", columns: new[] { "DivisionId", "Name" }, unique: true);
            migrationBuilder.CreateIndex(name: "IX_Companies_Division_Name_Unique", table: "companies", columns: new[] { "DivisionId", "Name" }, unique: true);

            migrationBuilder.AddForeignKey(name: "FK_companies_divisions_DivisionId", table: "companies", column: "DivisionId", principalTable: "divisions", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_contractors_divisions_DivisionId", table: "contractors", column: "DivisionId", principalTable: "divisions", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_issues_divisions_DivisionId", table: "issues", column: "DivisionId", principalTable: "divisions", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_locations_divisions_DivisionId", table: "locations", column: "DivisionId", principalTable: "divisions", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_machines_divisions_DivisionId", table: "machines", column: "DivisionId", principalTable: "divisions", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_operators_divisions_DivisionId", table: "operators", column: "DivisionId", principalTable: "divisions", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_returns_divisions_DivisionId", table: "returns", column: "DivisionId", principalTable: "divisions", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_statuses_divisions_DivisionId", table: "statuses", column: "DivisionId", principalTable: "divisions", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_tool_categories_divisions_DivisionId", table: "tool_categories", column: "DivisionId", principalTable: "divisions", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_tools_divisions_DivisionId", table: "tools", column: "DivisionId", principalTable: "divisions", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_users_divisions_DivisionId", table: "users", column: "DivisionId", principalTable: "divisions", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_companies_divisions_DivisionId",
                table: "companies");

            migrationBuilder.DropForeignKey(
                name: "FK_contractors_divisions_DivisionId",
                table: "contractors");

            migrationBuilder.DropForeignKey(
                name: "FK_issues_divisions_DivisionId",
                table: "issues");

            migrationBuilder.DropForeignKey(
                name: "FK_locations_divisions_DivisionId",
                table: "locations");

            migrationBuilder.DropForeignKey(
                name: "FK_machines_divisions_DivisionId",
                table: "machines");

            migrationBuilder.DropForeignKey(
                name: "FK_operators_divisions_DivisionId",
                table: "operators");

            migrationBuilder.DropForeignKey(
                name: "FK_returns_divisions_DivisionId",
                table: "returns");

            migrationBuilder.DropForeignKey(
                name: "FK_statuses_divisions_DivisionId",
                table: "statuses");

            migrationBuilder.DropForeignKey(
                name: "FK_tool_categories_divisions_DivisionId",
                table: "tool_categories");

            migrationBuilder.DropForeignKey(
                name: "FK_tools_divisions_DivisionId",
                table: "tools");

            migrationBuilder.DropForeignKey(
                name: "FK_users_divisions_DivisionId",
                table: "users");

            migrationBuilder.DropTable(
                name: "divisions");

            migrationBuilder.DropIndex(
                name: "IX_users_DivisionId",
                table: "users");

            migrationBuilder.DropIndex(
                name: "IX_Items_Division_CategoryId_ItemName_Unique",
                table: "tools");

            migrationBuilder.DropIndex(
                name: "IX_tools_categoryId",
                table: "tools");

            migrationBuilder.DropIndex(
                name: "IX_ItemCategories_Division_Name_Unique",
                table: "tool_categories");

            migrationBuilder.DropIndex(
                name: "IX_Statuses_Division_Name_Unique",
                table: "statuses");

            migrationBuilder.DropIndex(
                name: "IX_returns_DivisionId",
                table: "returns");

            migrationBuilder.DropIndex(
                name: "IX_operators_DivisionId",
                table: "operators");

            migrationBuilder.DropIndex(
                name: "IX_machines_ContractorId",
                table: "machines");

            migrationBuilder.DropIndex(
                name: "IX_Machines_Division_ContractorId_Name_Unique",
                table: "machines");

            migrationBuilder.DropIndex(
                name: "IX_locations_CompanyId",
                table: "locations");

            migrationBuilder.DropIndex(
                name: "IX_Locations_Division_CompanyId_Name_Unique",
                table: "locations");

            migrationBuilder.DropIndex(
                name: "IX_issues_DivisionId",
                table: "issues");

            migrationBuilder.DropIndex(
                name: "IX_Contractors_Division_Name_Unique",
                table: "contractors");

            migrationBuilder.DropIndex(
                name: "IX_Companies_Division_Name_Unique",
                table: "companies");

            migrationBuilder.DropColumn(
                name: "DivisionId",
                table: "users");

            migrationBuilder.DropColumn(
                name: "ViewDivisionMaster",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "DivisionId",
                table: "tools");

            migrationBuilder.DropColumn(
                name: "DivisionId",
                table: "tool_categories");

            migrationBuilder.DropColumn(
                name: "DivisionId",
                table: "statuses");

            migrationBuilder.DropColumn(
                name: "DivisionId",
                table: "returns");

            migrationBuilder.DropColumn(
                name: "DivisionId",
                table: "operators");

            migrationBuilder.DropColumn(
                name: "DivisionId",
                table: "machines");

            migrationBuilder.DropColumn(
                name: "DivisionId",
                table: "locations");

            migrationBuilder.DropColumn(
                name: "DivisionId",
                table: "issues");

            migrationBuilder.DropColumn(
                name: "DivisionId",
                table: "contractors");

            migrationBuilder.DropColumn(
                name: "DivisionId",
                table: "companies");

            migrationBuilder.CreateIndex(
                name: "IX_Items_CategoryId_ItemName_Unique",
                table: "tools",
                columns: new[] { "categoryId", "toolName" },
                unique: true,
                filter: "[categoryId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ItemCategories_Name_Unique",
                table: "tool_categories",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Statuses_Name_Unique",
                table: "statuses",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Machines_ContractorId_Name_Unique",
                table: "machines",
                columns: new[] { "ContractorId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Locations_CompanyId_Name_Unique",
                table: "locations",
                columns: new[] { "CompanyId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Contractors_Name_Unique",
                table: "contractors",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Companies_Name_Unique",
                table: "companies",
                column: "Name",
                unique: true);
        }
    }
}
