using net_backend.Models;

namespace net_backend.DTOs
{
    public class UpdateSettingsRequest
    {
        public string? CompanyName { get; set; }
        public string? SoftwareName { get; set; }
        public string? PrimaryColor { get; set; }
    }

    public class UpdatePermissionsRequest
    {
        public List<RolePermission> Permissions { get; set; } = new List<RolePermission>();
    }
}
