using Microsoft.AspNetCore.Http;
using System.Linq;

namespace net_backend.Services
{
    public interface IDivisionService
    {
        int? GetCurrentDivisionId();
        string? GetCurrentDivisionName();
    }

    public class DivisionService : IDivisionService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly net_backend.Data.ApplicationDbContext _context;

        public DivisionService(IHttpContextAccessor httpContextAccessor, net_backend.Data.ApplicationDbContext context)
        {
            _httpContextAccessor = httpContextAccessor;
            _context = context;
        }

        public int? GetCurrentDivisionId()
        {
            var context = _httpContextAccessor.HttpContext;
            if (context == null) return null;

            // Try to get from Header first (X-Division-Id)
            if (context.Request.Headers.TryGetValue("X-Division-Id", out var divisionIdStr) && int.TryParse(divisionIdStr, out int divisionId))
            {
                // Validate Access
                var user = context.User;
                if (user == null || !user.Identity.IsAuthenticated) 
                {
                    // If not authenticated, we can't validate. 
                    // Depending on policy, we might allow it (for login) or deny.
                    // But DivisionIsolatedController usually requires Auth.
                    // For safety, if we rely on this for data isolation, we should probably return NULL if not validated,
                    // BUT some endpoints might use this service before full Auth?
                    // actually, DivisionIsolatedController is [Authorize] usually? 
                    // Let's assume strict validation.
                    return null; 
                }

                var userIdClaim = user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var roleClaim = user.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

                if (string.IsNullOrEmpty(userIdClaim)) return null;
                int userId = int.Parse(userIdClaim);

                // Admin: Check if division exists and is active
                if (roleClaim == "QC_ADMIN")
                {
                    var exists = _context.Divisions.Any(d => d.Id == divisionId && d.IsActive);
                    return exists ? divisionId : null;
                }

                // Standard User: Check UserDivisions mapping
                var hasAccess = _context.UserDivisions.Any(ud => ud.UserId == userId && ud.DivisionId == divisionId && ud.Division.IsActive);
                return hasAccess ? divisionId : null;
            }

            // Fallback: none
            return null;
        }

        public string? GetCurrentDivisionName()
        {
            var divisionId = GetCurrentDivisionId();
            if (divisionId == null) return null;

            return _context.Divisions
                .Where(d => d.Id == divisionId)
                .Select(d => d.Name)
                .FirstOrDefault();
        }
    }
}
