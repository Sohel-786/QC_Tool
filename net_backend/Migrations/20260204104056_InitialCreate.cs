using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class InitialCreate : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "app_settings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CompanyLogo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SoftwareName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    PrimaryColor = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    SupportEmail = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    SupportPhone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Website = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_app_settings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "companies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_companies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "contractors",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contractors", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "locations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_locations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "machines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_machines", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "operators",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FullName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProfileImage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FingerprintTemplate = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_operators", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "role_permissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ViewDashboard = table.Column<bool>(type: "bit", nullable: false),
                    ViewMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewOutward = table.Column<bool>(type: "bit", nullable: false),
                    ViewInward = table.Column<bool>(type: "bit", nullable: false),
                    ViewReports = table.Column<bool>(type: "bit", nullable: false),
                    ImportExportMaster = table.Column<bool>(type: "bit", nullable: false),
                    AddOutward = table.Column<bool>(type: "bit", nullable: false),
                    EditOutward = table.Column<bool>(type: "bit", nullable: false),
                    AddInward = table.Column<bool>(type: "bit", nullable: false),
                    EditInward = table.Column<bool>(type: "bit", nullable: false),
                    AddMaster = table.Column<bool>(type: "bit", nullable: false),
                    EditMaster = table.Column<bool>(type: "bit", nullable: false),
                    ManageUsers = table.Column<bool>(type: "bit", nullable: false),
                    AccessSettings = table.Column<bool>(type: "bit", nullable: false),
                    NavigationLayout = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role_permissions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "statuses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_statuses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tool_categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tool_categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Username = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Password = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Role = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Avatar = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tools",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    toolName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SerialNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Image = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    categoryId = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tools", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tools_tool_categories_categoryId",
                        column: x => x.categoryId,
                        principalTable: "tool_categories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EntityId = table.Column<int>(type: "int", nullable: true),
                    OldValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_audit_logs_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "issues",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IssueNo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    toolId = table.Column<int>(type: "int", nullable: false),
                    IssuedBy = table.Column<int>(type: "int", nullable: false),
                    IssuedTo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CompanyId = table.Column<int>(type: "int", nullable: false),
                    ContractorId = table.Column<int>(type: "int", nullable: false),
                    MachineId = table.Column<int>(type: "int", nullable: false),
                    LocationId = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsReturned = table.Column<bool>(type: "bit", nullable: false),
                    IssuedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_issues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_issues_companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_issues_contractors_ContractorId",
                        column: x => x.ContractorId,
                        principalTable: "contractors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_issues_locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_issues_machines_MachineId",
                        column: x => x.MachineId,
                        principalTable: "machines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_issues_tools_toolId",
                        column: x => x.toolId,
                        principalTable: "tools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_issues_users_IssuedBy",
                        column: x => x.IssuedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "returns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReturnCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IssueId = table.Column<int>(type: "int", nullable: true),
                    ItemId = table.Column<int>(type: "int", nullable: true),
                    Condition = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ReturnedBy = table.Column<int>(type: "int", nullable: false),
                    ReturnImage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReceivedBy = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    StatusId = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    ReturnedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompanyId = table.Column<int>(type: "int", nullable: true),
                    ContractorId = table.Column<int>(type: "int", nullable: true),
                    MachineId = table.Column<int>(type: "int", nullable: true),
                    LocationId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_returns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_returns_companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "companies",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_returns_contractors_ContractorId",
                        column: x => x.ContractorId,
                        principalTable: "contractors",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_returns_issues_IssueId",
                        column: x => x.IssueId,
                        principalTable: "issues",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_returns_locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "locations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_returns_machines_MachineId",
                        column: x => x.MachineId,
                        principalTable: "machines",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_returns_statuses_StatusId",
                        column: x => x.StatusId,
                        principalTable: "statuses",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_returns_tools_ItemId",
                        column: x => x.ItemId,
                        principalTable: "tools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_returns_users_ReturnedBy",
                        column: x => x.ReturnedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_UserId",
                table: "audit_logs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_issues_CompanyId",
                table: "issues",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_issues_ContractorId",
                table: "issues",
                column: "ContractorId");

            migrationBuilder.CreateIndex(
                name: "IX_issues_IssuedBy",
                table: "issues",
                column: "IssuedBy");

            migrationBuilder.CreateIndex(
                name: "IX_issues_LocationId",
                table: "issues",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_issues_MachineId",
                table: "issues",
                column: "MachineId");

            migrationBuilder.CreateIndex(
                name: "IX_issues_toolId",
                table: "issues",
                column: "toolId");

            migrationBuilder.CreateIndex(
                name: "IX_returns_CompanyId",
                table: "returns",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_returns_ContractorId",
                table: "returns",
                column: "ContractorId");

            migrationBuilder.CreateIndex(
                name: "IX_returns_IssueId",
                table: "returns",
                column: "IssueId");

            migrationBuilder.CreateIndex(
                name: "IX_returns_ItemId",
                table: "returns",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_returns_LocationId",
                table: "returns",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_returns_MachineId",
                table: "returns",
                column: "MachineId");

            migrationBuilder.CreateIndex(
                name: "IX_returns_ReturnedBy",
                table: "returns",
                column: "ReturnedBy");

            migrationBuilder.CreateIndex(
                name: "IX_returns_StatusId",
                table: "returns",
                column: "StatusId");

            migrationBuilder.CreateIndex(
                name: "IX_tools_categoryId",
                table: "tools",
                column: "categoryId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "app_settings");

            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "operators");

            migrationBuilder.DropTable(
                name: "returns");

            migrationBuilder.DropTable(
                name: "role_permissions");

            migrationBuilder.DropTable(
                name: "issues");

            migrationBuilder.DropTable(
                name: "statuses");

            migrationBuilder.DropTable(
                name: "companies");

            migrationBuilder.DropTable(
                name: "contractors");

            migrationBuilder.DropTable(
                name: "locations");

            migrationBuilder.DropTable(
                name: "machines");

            migrationBuilder.DropTable(
                name: "tools");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "tool_categories");
        }
    }
}
