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

            // Unique constraints for Master Entries
            
            // Global unique constraints
            modelBuilder.Entity<Company>()
                .HasIndex(c => c.Name)
                .IsUnique()
                .HasDatabaseName("IX_Companies_Name_Unique");

            modelBuilder.Entity<Contractor>()
                .HasIndex(c => c.Name)
                .IsUnique()
                .HasDatabaseName("IX_Contractors_Name_Unique");

            modelBuilder.Entity<ItemCategory>()
                .HasIndex(ic => ic.Name)
                .IsUnique()
                .HasDatabaseName("IX_ItemCategories_Name_Unique");

            modelBuilder.Entity<Status>()
                .HasIndex(s => s.Name)
                .IsUnique()
                .HasDatabaseName("IX_Statuses_Name_Unique");

            // Composite unique constraints
            modelBuilder.Entity<Location>()
                .HasIndex(l => new { l.CompanyId, l.Name })
                .IsUnique()
                .HasDatabaseName("IX_Locations_CompanyId_Name_Unique");

            modelBuilder.Entity<Machine>()
                .HasIndex(m => new { m.ContractorId, m.Name })
                .IsUnique()
                .HasDatabaseName("IX_Machines_ContractorId_Name_Unique");

            modelBuilder.Entity<Item>()
                .HasIndex(i => new { i.CategoryId, i.ItemName })
                .IsUnique()
                .HasDatabaseName("IX_Items_CategoryId_ItemName_Unique");
        }
    }
}
