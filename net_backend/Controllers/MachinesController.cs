using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("machines")]
    [ApiController]
    public class MachinesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public MachinesController(ApplicationDbContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Machine>>>> GetAll() => 
            Ok(new ApiResponse<IEnumerable<Machine>> { Data = await _context.Machines.ToListAsync() });

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Machine>>>> GetActive() => 
            Ok(new ApiResponse<IEnumerable<Machine>> { Data = await _context.Machines.Where(c => c.IsActive).ToListAsync() });

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Machine>>> GetById(int id)
        {
            var item = await _context.Machines.FindAsync(id);
            return item == null ? NotFound() : Ok(new ApiResponse<Machine> { Data = item });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Machine>>> Create([FromBody] CreateCompanyRequest request)
        {
            var item = new Machine { Name = request.Name, IsActive = request.IsActive ?? true };
            _context.Machines.Add(item);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<Machine> { Data = item });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Machine>>> Update(int id, [FromBody] CreateCompanyRequest request)
        {
            var item = await _context.Machines.FindAsync(id);
            if (item == null) return NotFound();
            if (!string.IsNullOrEmpty(request.Name)) item.Name = request.Name;
            if (request.IsActive.HasValue) item.IsActive = request.IsActive.Value;
            item.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Machine> { Data = item });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            var item = await _context.Machines.FindAsync(id);
            if (item == null) return NotFound();
            _context.Machines.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
