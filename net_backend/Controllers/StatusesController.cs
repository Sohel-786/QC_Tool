using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("statuses")]
    [ApiController]
    public class StatusesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public StatusesController(ApplicationDbContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Status>>>> GetAll() => 
            Ok(new ApiResponse<IEnumerable<Status>> { Data = await _context.Statuses.ToListAsync() });

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Status>>>> GetActive() => 
            Ok(new ApiResponse<IEnumerable<Status>> { Data = await _context.Statuses.Where(c => c.IsActive).ToListAsync() });

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Status>>> GetById(int id)
        {
            var item = await _context.Statuses.FindAsync(id);
            return item == null ? NotFound() : Ok(new ApiResponse<Status> { Data = item });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Status>>> Create([FromBody] CreateCompanyRequest request)
        {
            var item = new Status { Name = request.Name, IsActive = request.IsActive ?? true };
            _context.Statuses.Add(item);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<Status> { Data = item });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Status>>> Update(int id, [FromBody] CreateCompanyRequest request)
        {
            var item = await _context.Statuses.FindAsync(id);
            if (item == null) return NotFound();
            if (!string.IsNullOrEmpty(request.Name)) item.Name = request.Name;
            if (request.IsActive.HasValue) item.IsActive = request.IsActive.Value;
            item.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Status> { Data = item });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            var item = await _context.Statuses.FindAsync(id);
            if (item == null) return NotFound();
            _context.Statuses.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
