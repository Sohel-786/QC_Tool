using Microsoft.EntityFrameworkCore;
using net_backend.Models;

namespace net_backend.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<AppSettings> AppSettings { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<Division> Divisions { get; set; }
        public DbSet<Company> Companies { get; set; }
        public DbSet<Contractor> Contractors { get; set; }
        public DbSet<Issue> Issues { get; set; }
        public DbSet<Item> Items { get; set; }
        public DbSet<ItemCategory> ItemCategories { get; set; }
        public DbSet<Location> Locations { get; set; }
        public DbSet<Machine> Machines { get; set; }
        public DbSet<Return> Returns { get; set; }
        public DbSet<UserPermission> UserPermissions { get; set; }
        public DbSet<Status> Statuses { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Operator> Operators { get; set; }
        public DbSet<UserDivision> UserDivisions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure relationships and constraints

            modelBuilder.Entity<Issue>()
                .HasOne(i => i.IssuedByUser)
                .WithMany(u => u.IssuedIssues)
                .HasForeignKey(i => i.IssuedBy)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Return>()
                .HasOne(r => r.ReturnedByUser)
                .WithMany(u => u.ReturnedReturns)
                .HasForeignKey(r => r.ReturnedBy)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Return>()
                .HasOne(r => r.Item)
                .WithMany(i => i.MissingReturns)
                .HasForeignKey(r => r.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<AuditLog>()
                .HasOne(a => a.User)
                .WithMany(u => u.AuditLogs)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Precise decimal or string length configurations if needed
            modelBuilder.Entity<AppSettings>()
                .Property(a => a.Address)
                .HasColumnType("nvarchar(max)");

            modelBuilder.Entity<Operator>()
                .Property(o => o.Address)
                .HasColumnType("nvarchar(max)");

            modelBuilder.Entity<Operator>()
                .Property(o => o.FingerprintTemplate)
                .HasColumnType("nvarchar(max)");

            modelBuilder.Entity<Location>()
                .HasOne(l => l.Company)
                .WithMany(c => c.Locations)
                .HasForeignKey(l => l.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Machine>()
                .HasOne(m => m.Contractor)
                .WithMany(c => c.Machines)
                .HasForeignKey(m => m.ContractorId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Item>()
                .Property(i => i.Status);

            // Division-aware unique constraints for Master Entries
            
            modelBuilder.Entity<Division>()
                .HasIndex(d => d.Name)
                .IsUnique()
                .HasDatabaseName("IX_Divisions_Name_Unique");

            modelBuilder.Entity<Company>()
                .HasIndex(c => new { c.DivisionId, c.Name })
                .IsUnique()
                .HasDatabaseName("IX_Companies_Division_Name_Unique");

            modelBuilder.Entity<Contractor>()
                .HasIndex(c => new { c.DivisionId, c.Name })
                .IsUnique()
                .HasDatabaseName("IX_Contractors_Division_Name_Unique");

            modelBuilder.Entity<ItemCategory>()
                .HasIndex(ic => new { ic.DivisionId, ic.Name })
                .IsUnique()
                .HasDatabaseName("IX_ItemCategories_Division_Name_Unique");

            modelBuilder.Entity<Status>()
                .HasIndex(s => new { s.DivisionId, s.Name })
                .IsUnique()
                .HasDatabaseName("IX_Statuses_Division_Name_Unique");

            // Composite unique constraints
            modelBuilder.Entity<Location>()
                .HasIndex(l => new { l.DivisionId, l.CompanyId, l.Name })
                .IsUnique()
                .HasDatabaseName("IX_Locations_Division_CompanyId_Name_Unique");

            modelBuilder.Entity<Machine>()
                .HasIndex(m => new { m.DivisionId, m.ContractorId, m.Name })
                .IsUnique()
                .HasDatabaseName("IX_Machines_Division_ContractorId_Name_Unique");

            modelBuilder.Entity<Item>()
                .HasIndex(i => new { i.DivisionId, i.CategoryId, i.ItemName })
                .IsUnique()
                .HasDatabaseName("IX_Items_Division_CategoryId_ItemName_Unique");

            // Global restrict delete for Division to avoid multiple cascade paths in SQL Server
            foreach (var entity in modelBuilder.Model.GetEntityTypes())
            {
                var divisionFks = entity.GetForeignKeys()
                    .Where(fk => fk.PrincipalEntityType.ClrType == typeof(Division));
                foreach (var fk in divisionFks)
                {
                    fk.DeleteBehavior = DeleteBehavior.Restrict;
                }
            }

            // UserDivision relationships
            modelBuilder.Entity<UserDivision>()
                .HasOne(ud => ud.User)
                .WithMany(u => u.UserDivisions)
                .HasForeignKey(ud => ud.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserDivision>()
                .HasOne(ud => ud.Division)
                .WithMany(d => d.UserDivisions)
                .HasForeignKey(ud => ud.DivisionId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<UserDivision>()
                .HasIndex(ud => new { ud.UserId, ud.DivisionId })
                .IsUnique()
                .HasDatabaseName("IX_UserDivisions_UserId_DivisionId_Unique");
        }
    }
}
