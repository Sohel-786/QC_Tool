using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("companies")]
    [ApiController]
    public class CompaniesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IExcelService _excelService;

        public CompaniesController(ApplicationDbContext context, IExcelService excelService)
        {
            _context = context;
            _excelService = excelService;
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            var companies = await _context.Companies.ToListAsync();
            var data = companies.Select(c => new {
                Id = c.Id,
                Name = c.Name,
                IsActive = c.IsActive ? "Yes" : "No",
                CreatedAt = c.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });

            var file = _excelService.GenerateExcel(data, "Companies");
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "companies.xlsx");
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return Ok(new ApiResponse<object> { Success = false, Message = "No file uploaded" });

            try
            {
                using (var stream = file.OpenReadStream())
                {
                    var result = _excelService.ImportExcel<CompanyImportDto>(stream);
                    var newCompanies = new List<Company>();
                    
                    var existingNames = await _context.Companies.Select(c => c.Name.ToLower()).ToListAsync();
                    var processedInFile = new HashSet<string>();

                    foreach (var row in result.Data)
                    {
                        var item = row.Data;
                        if (string.IsNullOrWhiteSpace(item.Name)) 
                        {
                            result.Errors.Add(new RowError { Row = row.RowNumber, Message = "Name is mandatory" });
                            continue;
                        }

                        var nameLower = item.Name.Trim().ToLower();

                        if (processedInFile.Contains(nameLower))
                        {
                            result.Errors.Add(new RowError { Row = row.RowNumber, Message = $"Duplicate Company Name in file: {item.Name}" });
                            continue;
                        }

                        if (existingNames.Contains(nameLower))
                        {
                            result.Errors.Add(new RowError { Row = row.RowNumber, Message = $"Company '{item.Name}' already exists in database" });
                            processedInFile.Add(nameLower);
                            continue;
                        }

                        newCompanies.Add(new Company {
                            Name = item.Name.Trim(),
                            IsActive = true,
                            CreatedAt = DateTime.Now,
                            UpdatedAt = DateTime.Now
                        });
                        processedInFile.Add(nameLower);
                    }

                    if (newCompanies.Any())
                    {
                        _context.Companies.AddRange(newCompanies);
                        await _context.SaveChangesAsync();
                    }

                    var finalResult = new {
                        imported = newCompanies.Count,
                        totalRows = result.TotalRows,
                        errors = result.Errors.OrderBy(e => e.Row).ToList()
                    };

                    return Ok(new ApiResponse<object> { Data = finalResult, Message = $"{newCompanies.Count} companies imported successfully" });
                }
            }
            catch (Exception ex)
            {
                return Ok(new ApiResponse<object> { Success = false, Message = $"Import failed: {ex.Message}" });
            }
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
