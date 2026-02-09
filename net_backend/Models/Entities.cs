using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace net_backend.Models
{
    [Table("app_settings")]
    public class AppSettings
    {
        public int Id { get; set; }
        [Required]
        public string CompanyName { get; set; } = "QC Item System";
        public string? CompanyLogo { get; set; }
        [MaxLength(255)]
        public string? SoftwareName { get; set; }
        [MaxLength(20)]
        public string? PrimaryColor { get; set; }
        [MaxLength(255)]
        public string? SupportEmail { get; set; }
        [MaxLength(50)]
        public string? SupportPhone { get; set; }
        public string? Address { get; set; }
        [MaxLength(255)]
        public string? Website { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    [Table("audit_logs")]
    public class AuditLog
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        [Required]
        public string Action { get; set; } = string.Empty;
        [Required]
        public string EntityType { get; set; } = string.Empty;
        public int? EntityId { get; set; }
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public string? IpAddress { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }

    [Table("companies")]
    public class Company
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        public virtual ICollection<Location> Locations { get; set; } = new List<Location>();
        public virtual ICollection<Issue> Issues { get; set; } = new List<Issue>();
        public virtual ICollection<Return> Returns { get; set; } = new List<Return>();
    }

    [Table("contractors")]
    public class Contractor
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        public virtual ICollection<Issue> Issues { get; set; } = new List<Issue>();
        public virtual ICollection<Return> Returns { get; set; } = new List<Return>();
        public virtual ICollection<Machine> Machines { get; set; } = new List<Machine>();
    }

    [Table("tool_categories")]
    public class ItemCategory
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        public virtual ICollection<Item> Items { get; set; } = new List<Item>();
    }

    [Table("tools")]
    public class Item
    {
        public int Id { get; set; }
        [Required]
        [Column("toolName")]
        public string ItemName { get; set; } = string.Empty;
        public string? SerialNumber { get; set; }
        public string? Description { get; set; }
        public string? Image { get; set; }
        [Column("categoryId")]
        public int? CategoryId { get; set; }
        public ItemStatus Status { get; set; } = ItemStatus.AVAILABLE;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("CategoryId")]
        public virtual ItemCategory? Category { get; set; }
        public virtual ICollection<Issue> Issues { get; set; } = new List<Issue>();
        public virtual ICollection<Return> MissingReturns { get; set; } = new List<Return>();
    }

    [Table("locations")]
    public class Location
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public int CompanyId { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("CompanyId")]
        public virtual Company? Company { get; set; }
        public virtual ICollection<Issue> Issues { get; set; } = new List<Issue>();
        public virtual ICollection<Return> Returns { get; set; } = new List<Return>();
    }

    [Table("machines")]
    public class Machine
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public int ContractorId { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("ContractorId")]
        public virtual Contractor? Contractor { get; set; }
        public virtual ICollection<Issue> Issues { get; set; } = new List<Issue>();
        public virtual ICollection<Return> Returns { get; set; } = new List<Return>();
    }

    [Table("statuses")]
    public class Status
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
        public virtual ICollection<Return> Returns { get; set; } = new List<Return>();
    }

    [Table("users")]
    public class User
    {
        public int Id { get; set; }
        [Required]
        public string Username { get; set; } = string.Empty;
        [Required]
        public string Password { get; set; } = string.Empty;
        [Required]
        public string FirstName { get; set; } = string.Empty;
        [Required]
        public string LastName { get; set; } = string.Empty;
        public Role Role { get; set; } = Role.QC_USER;
        public bool IsActive { get; set; } = true;
        public string? Avatar { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        public virtual ICollection<Issue> IssuedIssues { get; set; } = new List<Issue>();
        public virtual ICollection<Return> ReturnedReturns { get; set; } = new List<Return>();
        public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    }

    [Table("operators")]
    public class Operator
    {
        public int Id { get; set; }
        [Required]
        public string FullName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? ProfileImage { get; set; }
        public string? FingerprintTemplate { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    [Table("role_permissions")]
    public class RolePermission
    {
        public int Id { get; set; }
        [Required]
        [MaxLength(20)]
        public string Role { get; set; } = string.Empty;
        public bool ViewDashboard { get; set; } = true;
        public bool ViewMaster { get; set; } = true;
        public bool ViewCompanyMaster { get; set; } = true;
        public bool ViewLocationMaster { get; set; } = true;
        public bool ViewContractorMaster { get; set; } = true;
        public bool ViewStatusMaster { get; set; } = true;
        public bool ViewMachineMaster { get; set; } = true;
        public bool ViewItemMaster { get; set; } = true;
        public bool ViewItemCategoryMaster { get; set; } = true;
        public bool ViewOutward { get; set; } = true;
        public bool ViewInward { get; set; } = true;
        public bool ViewReports { get; set; } = true;
        public bool ViewActiveIssuesReport { get; set; } = true;
        public bool ViewMissingItemsReport { get; set; } = true;
        public bool ViewItemHistoryLedgerReport { get; set; } = true;
        public bool ImportExportMaster { get; set; } = false;
        public bool AddOutward { get; set; } = true;
        public bool EditOutward { get; set; } = true;
        public bool AddInward { get; set; } = true;
        public bool EditInward { get; set; } = true;
        public bool AddMaster { get; set; } = true;
        public bool EditMaster { get; set; } = true;
        public bool ManageUsers { get; set; } = false;
        public bool AccessSettings { get; set; } = false;
        [MaxLength(20)]
        public string NavigationLayout { get; set; } = "VERTICAL";
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    [Table("issues")]
    public class Issue
    {
        public int Id { get; set; }
        [Required]
        public string IssueNo { get; set; } = string.Empty;
        [Column("toolId")]
        public int ItemId { get; set; }
        public int IssuedBy { get; set; }
        public string? IssuedTo { get; set; }
        public string? Remarks { get; set; }
        public int CompanyId { get; set; }
        public int ContractorId { get; set; }
        public int MachineId { get; set; }
        public int LocationId { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsReturned { get; set; } = false;
        public DateTime IssuedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("ItemId")]
        public virtual Item? Item { get; set; }
        [ForeignKey("IssuedBy")]
        public virtual User? IssuedByUser { get; set; }
        [ForeignKey("CompanyId")]
        public virtual Company? Company { get; set; }
        [ForeignKey("ContractorId")]
        public virtual Contractor? Contractor { get; set; }
        [ForeignKey("MachineId")]
        public virtual Machine? Machine { get; set; }
        [ForeignKey("LocationId")]
        public virtual Location? Location { get; set; }
        public virtual ICollection<Return> Returns { get; set; } = new List<Return>();
    }

    [Table("returns")]
    public class Return
    {
        public int Id { get; set; }
        public string? ReturnCode { get; set; }
        public int? IssueId { get; set; }
        public int? ItemId { get; set; }
        [Required]
        [MaxLength(50)]
        public string Condition { get; set; } = string.Empty;
        public int ReturnedBy { get; set; }
        public string? ReturnImage { get; set; }
        public string? Remarks { get; set; }
        [MaxLength(255)]
        public string? ReceivedBy { get; set; }
        public int? StatusId { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime ReturnedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        public int? CompanyId { get; set; }
        public int? ContractorId { get; set; }
        public int? MachineId { get; set; }
        public int? LocationId { get; set; }

        [ForeignKey("IssueId")]
        public virtual Issue? Issue { get; set; }
        [ForeignKey("ItemId")]
        public virtual Item? Item { get; set; }
        [ForeignKey("ReturnedBy")]
        public virtual User? ReturnedByUser { get; set; }
        [ForeignKey("StatusId")]
        public virtual Status? Status { get; set; }
        [ForeignKey("CompanyId")]
        public virtual Company? Company { get; set; }
        [ForeignKey("ContractorId")]
        public virtual Contractor? Contractor { get; set; }
        [ForeignKey("MachineId")]
        public virtual Machine? Machine { get; set; }
        [ForeignKey("LocationId")]
        public virtual Location? Location { get; set; }
    }
}
