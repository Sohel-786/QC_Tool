using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("companies")]
    [ApiController]
    public class CompaniesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CompaniesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Company>>>> GetAll()
        {
            var companies = await _context.Companies.ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Company>> { Data = companies });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Company>>>> GetActive()
        {
            var companies = await _context.Companies.Where(c => c.IsActive).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Company>> { Data = companies });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Company>>> GetById(int id)
        {
            var company = await _context.Companies.FindAsync(id);
            if (company == null)
            {
                return NotFound(new ApiResponse<Company> { Success = false, Message = $"Company with ID {id} not found" });
            }
            return Ok(new ApiResponse<Company> { Data = company });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Company>>> Create([FromBody] CreateCompanyRequest request)
        {
            if (string.IsNullOrEmpty(request.Name))
            {
                return BadRequest(new ApiResponse<Company> { Success = false, Message = "Company name is required" });
            }

            var company = new Company
            {
                Name = request.Name,
                IsActive = request.IsActive ?? true,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.Companies.Add(company);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<Company> { Data = company });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Company>>> Update(int id, [FromBody] CreateCompanyRequest request)
        {
            var company = await _context.Companies.FindAsync(id);
            if (company == null)
            {
                return NotFound(new ApiResponse<Company> { Success = false, Message = $"Company with ID {id} not found" });
            }

            if (!string.IsNullOrEmpty(request.Name)) company.Name = request.Name;
            if (request.IsActive.HasValue) company.IsActive = request.IsActive.Value;
            
            company.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<Company> { Data = company });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            var company = await _context.Companies.FindAsync(id);
            if (company == null)
            {
                return NotFound(new ApiResponse<bool> { Success = false, Message = $"Company with ID {id} not found" });
            }

            _context.Companies.Remove(company);
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
