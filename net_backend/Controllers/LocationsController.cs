using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("locations")]
    [ApiController]
    public class LocationsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public LocationsController(ApplicationDbContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Location>>>> GetAll() => 
            Ok(new ApiResponse<IEnumerable<Location>> { Data = await _context.Locations.ToListAsync() });

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Location>>>> GetActive() => 
            Ok(new ApiResponse<IEnumerable<Location>> { Data = await _context.Locations.Where(c => c.IsActive).ToListAsync() });

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Location>>> GetById(int id)
        {
            var item = await _context.Locations.FindAsync(id);
            return item == null ? NotFound() : Ok(new ApiResponse<Location> { Data = item });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Location>>> Create([FromBody] CreateCompanyRequest request)
        {
            var item = new Location { Name = request.Name, IsActive = request.IsActive ?? true };
            _context.Locations.Add(item);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<Location> { Data = item });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Location>>> Update(int id, [FromBody] CreateCompanyRequest request)
        {
            var item = await _context.Locations.FindAsync(id);
            if (item == null) return NotFound();
            if (!string.IsNullOrEmpty(request.Name)) item.Name = request.Name;
            if (request.IsActive.HasValue) item.IsActive = request.IsActive.Value;
            item.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Location> { Data = item });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            var item = await _context.Locations.FindAsync(id);
            if (item == null) return NotFound();
            _context.Locations.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
