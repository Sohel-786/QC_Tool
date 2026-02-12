using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("operators")]
    [ApiController]
    public class OperatorsController : DivisionIsolatedController
    {
        private readonly ApplicationDbContext _context;

        public OperatorsController(ApplicationDbContext context, IDivisionService divisionService)
            : base(divisionService)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Operator>>>> GetAll()
        {
            var operators = await _context.Operators
                .Where(o => o.DivisionId == CurrentDivisionId)
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Operator>> { Data = operators });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Operator>>> GetById(int id)
        {
            var op = await _context.Operators
                .FirstOrDefaultAsync(o => o.Id == id && o.DivisionId == CurrentDivisionId);
            if (op == null) return NotFound();
            return Ok(new ApiResponse<Operator> { Data = op });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Operator>>> Create([FromBody] Operator op)
        {
            op.DivisionId = CurrentDivisionId;
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
            var existing = await _context.Operators
                .FirstOrDefaultAsync(o => o.Id == id && o.DivisionId == CurrentDivisionId);
            if (existing == null) return NotFound();

            existing.FullName = op.FullName;
            existing.Phone = op.Phone;
            existing.Address = op.Address;
            existing.IsActive = op.IsActive;
            if (op.FingerprintTemplate != null) existing.FingerprintTemplate = op.FingerprintTemplate;
            existing.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Operator> { Data = existing });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
             var op = await _context.Operators
                .FirstOrDefaultAsync(o => o.Id == id && o.DivisionId == CurrentDivisionId);
            if (op == null) return NotFound();

            _context.Operators.Remove(op);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
