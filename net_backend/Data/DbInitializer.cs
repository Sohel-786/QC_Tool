using net_backend.Models;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;

namespace net_backend.Data
{
    public static class DbInitializer
    {
        public static void Initialize(ApplicationDbContext context)
        {
            context.Database.EnsureCreated();

            // 1. Seed Users
            if (!context.Users.Any())
            {
                var users = new User[]
                {
                    new User { Username = "qc_admin", Password = BCrypt.Net.BCrypt.HashPassword("admin123"), FirstName = "QC", LastName = "Admin", Role = Role.QC_ADMIN, IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now },
                    new User { Username = "qc_manager", Password = BCrypt.Net.BCrypt.HashPassword("password123"), FirstName = "QC", LastName = "Manager", Role = Role.QC_MANAGER, IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now },
                    new User { Username = "qc_user", Password = BCrypt.Net.BCrypt.HashPassword("password123"), FirstName = "QC", LastName = "User", Role = Role.QC_USER, IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now }
                };
                context.Users.AddRange(users);
                context.SaveChanges();
            }

            // 2. Seed App Settings
            if (!context.AppSettings.Any())
            {
                context.AppSettings.Add(new AppSettings { CompanyName = "QC Item System", CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now });
                context.SaveChanges();
            }

            // 3. Seed Statuses
            if (!context.Statuses.Any())
            {
                context.Statuses.AddRange(new Status[] {
                    new Status { Name = "Available", IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now },
                    new Status { Name = "Missing", IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now }
                });
                context.SaveChanges();
            }

            // 4. Seed Item Categories
            if (!context.ItemCategories.Any())
            {
                context.ItemCategories.AddRange(new ItemCategory[] {
                    new ItemCategory { Name = "Gate Valves", IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now },
                    new ItemCategory { Name = "Globe Valves", IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now },
                    new ItemCategory { Name = "Ball Valves", IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now },
                    new ItemCategory { Name = "Actuators", IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now }
                });
                context.SaveChanges();
            }

            // 5. Seed Companies
            if (!context.Companies.Any())
            {
                context.Companies.AddRange(new Company[] {
                    new Company { Name = "Aira Euro Valves Pvt Ltd", IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now },
                    new Company { Name = "ValveTech Industries", IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now }
                });
                context.SaveChanges();
            }

            // 6. Seed Contractors
            if (!context.Contractors.Any())
            {
                context.Contractors.AddRange(new Contractor[] {
                    new Contractor { Name = "ABC Maintenance", IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now },
                    new Contractor { Name = "Site Works Ltd", IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now }
                });
                context.SaveChanges();
            }

            // 7. Seed Machines
            if (!context.Machines.Any())
            {
                context.Machines.AddRange(new Machine[] {
                    new Machine { Name = "Lathe-01", IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now },
                    new Machine { Name = "CNC-02", IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now }
                });
                context.SaveChanges();
            }

            // 8. Seed Locations
            if (!context.Locations.Any())
            {
                context.Locations.AddRange(new Location[] {
                    new Location { Name = "Store A", IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now },
                    new Location { Name = "Production Floor 1", IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now }
                });
                context.SaveChanges();
            }

            // 9. Seed Role Permissions
            if (!context.RolePermissions.Any())
            {
                var permissions = new RolePermission[]
                {
                    new RolePermission { Role = "QC_ADMIN", ViewDashboard = true, ViewMaster = true, ViewOutward = true, ViewInward = true, ViewReports = true, ImportExportMaster = true, AddOutward = true, EditOutward = true, AddInward = true, EditInward = true, AddMaster = true, EditMaster = true, ManageUsers = true, AccessSettings = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now },
                    new RolePermission { Role = "QC_MANAGER", ViewDashboard = true, ViewMaster = true, ViewOutward = true, ViewInward = true, ViewReports = true, ImportExportMaster = true, AddOutward = true, EditOutward = true, AddInward = true, EditInward = true, AddMaster = true, EditMaster = true, ManageUsers = false, AccessSettings = false, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now },
                    new RolePermission { Role = "QC_USER", ViewDashboard = true, ViewMaster = true, ViewOutward = true, ViewInward = true, ViewReports = true, ImportExportMaster = false, AddOutward = true, EditOutward = true, AddInward = true, EditInward = true, AddMaster = true, EditMaster = true, ManageUsers = false, AccessSettings = false, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now }
                };
                context.RolePermissions.AddRange(permissions);
                context.SaveChanges();
            }

            // 10. Seed Items
            if (!context.Items.Any())
            {
                var category = context.ItemCategories.First();
                var items = new Item[]
                {
                    new Item { ItemName = "Standard Gate Valve", SerialNumber = "GV0001", Description = "Manufacturing Unit Tool", CategoryId = category.Id, Status = ItemStatus.AVAILABLE, IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now },
                    new Item { ItemName = "Heavy Duty Actuator", SerialNumber = "ACT0002", Description = "Assembly Tool", CategoryId = category.Id, Status = ItemStatus.AVAILABLE, IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now },
                    new Item { ItemName = "Precision Ball Valve", SerialNumber = "BV0003", Description = "Testing Tool", CategoryId = category.Id, Status = ItemStatus.AVAILABLE, IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now }
                };
                context.Items.AddRange(items);
                context.SaveChanges();
            }

            // 11. Seed Transactions
            if (!context.Issues.Any())
            {
                var user = context.Users.First(u => u.Role == Role.QC_ADMIN);
                var item = context.Items.First();
                var company = context.Companies.First();
                var contractor = context.Contractors.First();
                var machine = context.Machines.First();
                var location = context.Locations.First();

                var issue = new Issue
                {
                    IssueNo = "OUT-001",
                    ItemId = item.Id,
                    IssuedBy = user.Id,
                    IssuedTo = "Operator 01",
                    CompanyId = company.Id,
                    ContractorId = contractor.Id,
                    MachineId = machine.Id,
                    LocationId = location.Id,
                    IsActive = true,
                    IsReturned = false,
                    IssuedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                };

                context.Issues.Add(issue);
                item.Status = ItemStatus.ISSUED;
                context.SaveChanges();

                if (!context.Returns.Any())
                {
                    var status = context.Statuses.First(s => s.Name == "Available");
                    var inward = new Return
                    {
                        ReturnCode = "INWARD-001",
                        IssueId = issue.Id,
                        Condition = "OK",
                        ReturnedBy = user.Id,
                        Remarks = "Routine return",
                        StatusId = status.Id,
                        IsActive = true,
                        ReturnedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    };
                    context.Returns.Add(inward);
                    issue.IsReturned = true;
                    item.Status = ItemStatus.AVAILABLE;
                    context.SaveChanges();
                }
            }
        }
    }
}
