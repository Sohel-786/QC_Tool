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
            if (context.Request.Headers.TryGetValue("X-Division-Id", out var divisionIdStr))
            {
                if (int.TryParse(divisionIdStr, out int divisionId))
                {
                    return divisionId;
                }
            }

            // Fallback: none, must be in header
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
