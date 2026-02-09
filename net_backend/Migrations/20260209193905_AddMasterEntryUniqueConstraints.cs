using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class AddMasterEntryUniqueConstraints : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_tools_categoryId",
                table: "tools");

            migrationBuilder.DropIndex(
                name: "IX_machines_ContractorId",
                table: "machines");

            migrationBuilder.DropIndex(
                name: "IX_locations_CompanyId",
                table: "locations");

            migrationBuilder.AlterColumn<string>(
                name: "toolName",
                table: "tools",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "tool_categories",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "statuses",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "machines",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "locations",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "contractors",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "companies",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

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

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Items_CategoryId_ItemName_Unique",
                table: "tools");

            migrationBuilder.DropIndex(
                name: "IX_ItemCategories_Name_Unique",
                table: "tool_categories");

            migrationBuilder.DropIndex(
                name: "IX_Statuses_Name_Unique",
                table: "statuses");

            migrationBuilder.DropIndex(
                name: "IX_Machines_ContractorId_Name_Unique",
                table: "machines");

            migrationBuilder.DropIndex(
                name: "IX_Locations_CompanyId_Name_Unique",
                table: "locations");

            migrationBuilder.DropIndex(
                name: "IX_Contractors_Name_Unique",
                table: "contractors");

            migrationBuilder.DropIndex(
                name: "IX_Companies_Name_Unique",
                table: "companies");

            migrationBuilder.AlterColumn<string>(
                name: "toolName",
                table: "tools",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "tool_categories",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "statuses",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "machines",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "locations",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "contractors",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "companies",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.CreateIndex(
                name: "IX_tools_categoryId",
                table: "tools",
                column: "categoryId");

            migrationBuilder.CreateIndex(
                name: "IX_machines_ContractorId",
                table: "machines",
                column: "ContractorId");

            migrationBuilder.CreateIndex(
                name: "IX_locations_CompanyId",
                table: "locations",
                column: "CompanyId");
        }
    }
}
