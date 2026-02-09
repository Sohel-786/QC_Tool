using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class AddGranularMasterPermissions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ViewCompanyMaster",
                table: "role_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ViewContractorMaster",
                table: "role_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ViewItemCategoryMaster",
                table: "role_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ViewItemMaster",
                table: "role_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ViewLocationMaster",
                table: "role_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ViewMachineMaster",
                table: "role_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ViewStatusMaster",
                table: "role_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql("UPDATE role_permissions SET ViewCompanyMaster = ViewMaster, ViewContractorMaster = ViewMaster, ViewItemCategoryMaster = ViewMaster, ViewItemMaster = ViewMaster, ViewLocationMaster = ViewMaster, ViewMachineMaster = ViewMaster, ViewStatusMaster = ViewMaster");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ViewCompanyMaster",
                table: "role_permissions");

            migrationBuilder.DropColumn(
                name: "ViewContractorMaster",
                table: "role_permissions");

            migrationBuilder.DropColumn(
                name: "ViewItemCategoryMaster",
                table: "role_permissions");

            migrationBuilder.DropColumn(
                name: "ViewItemMaster",
                table: "role_permissions");

            migrationBuilder.DropColumn(
                name: "ViewLocationMaster",
                table: "role_permissions");

            migrationBuilder.DropColumn(
                name: "ViewMachineMaster",
                table: "role_permissions");

            migrationBuilder.DropColumn(
                name: "ViewStatusMaster",
                table: "role_permissions");
        }
    }
}
