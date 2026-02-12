using net_backend.Models;

namespace net_backend.DTOs
{
    public class UpdateSettingsRequest
    {
        public string? CompanyName { get; set; }
        public string? SoftwareName { get; set; }
        public string? PrimaryColor { get; set; }
    }

    public class UpdateUserPermissionsRequest
    {
        public UserPermission? Permissions { get; set; }
        public List<int> AllowedDivisionIds { get; set; } = new();
    }
}
