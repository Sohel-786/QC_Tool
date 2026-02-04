using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("operators")]
    [ApiController]
    public class OperatorsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public OperatorsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Operator>>>> GetAll()
        {
            var operators = await _context.Operators.ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Operator>> { Data = operators });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Operator>>> GetById(int id)
        {
            var op = await _context.Operators.FindAsync(id);
            if (op == null) return NotFound();
            return Ok(new ApiResponse<Operator> { Data = op });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Operator>>> Create([FromBody] Operator op)
        {
            op.CreatedAt = DateTime.Now;
            op.UpdatedAt = DateTime.Now;
            _context.Operators.Add(op);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<Operator> { Data = op });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Operator>>> Update(int id, [FromBody] Operator op)
        {
            var existing = await _context.Operators.FindAsync(id);
            if (existing == null) return NotFound();

            existing.FullName = op.FullName;
            existing.Phone = op.Phone;
            existing.Address = op.Address;
            existing.IsActive = op.IsActive;
            existing.FingerprintTemplate = op.FingerprintTemplate;
            existing.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Operator> { Data = existing });
        }
    }
}
