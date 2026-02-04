using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("contractors")]
    [ApiController]
    public class ContractorsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public ContractorsController(ApplicationDbContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Contractor>>>> GetAll() => 
            Ok(new ApiResponse<IEnumerable<Contractor>> { Data = await _context.Contractors.ToListAsync() });

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Contractor>>>> GetActive() => 
            Ok(new ApiResponse<IEnumerable<Contractor>> { Data = await _context.Contractors.Where(c => c.IsActive).ToListAsync() });

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Contractor>>> GetById(int id)
        {
            var item = await _context.Contractors.FindAsync(id);
            return item == null ? NotFound(new ApiResponse<Contractor> { Success = false, Message = "Not found" }) : Ok(new ApiResponse<Contractor> { Data = item });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Contractor>>> Create([FromBody] CreateCompanyRequest request)
        {
            var item = new Contractor { Name = request.Name, IsActive = request.IsActive ?? true };
            _context.Contractors.Add(item);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<Contractor> { Data = item });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Contractor>>> Update(int id, [FromBody] CreateCompanyRequest request)
        {
            var item = await _context.Contractors.FindAsync(id);
            if (item == null) return NotFound();
            if (!string.IsNullOrEmpty(request.Name)) item.Name = request.Name;
            if (request.IsActive.HasValue) item.IsActive = request.IsActive.Value;
            item.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Contractor> { Data = item });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            var item = await _context.Contractors.FindAsync(id);
            if (item == null) return NotFound();
            _context.Contractors.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
