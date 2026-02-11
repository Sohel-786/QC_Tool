using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class AddIssueImageToIssues : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IssueImage",
                table: "issues",
                type: "nvarchar(max)",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IssueImage",
                table: "issues");
        }
    }
}
