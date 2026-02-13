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
    public class CompaniesController : DivisionIsolatedController
    {
        private readonly ApplicationDbContext _context;
        private readonly IExcelService _excelService;

        public CompaniesController(ApplicationDbContext context, IExcelService excelService, IDivisionService divisionService)
            : base(divisionService)
        {
            _context = context;
            _excelService = excelService;
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            var companies = await _context.Companies
                .Where(c => c.DivisionId == CurrentDivisionId)
                .ToListAsync();
            var data = companies.Select(c => new {
                Id = c.Id,
                Name = c.Name,
                IsActive = c.IsActive ? "Yes" : "No",
                CreatedAt = c.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });

            var file = _excelService.GenerateExcel(data, "Companies");
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "companies.xlsx");
        }

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<CompanyImportDto>>>> Validate(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<ValidationResultDto<CompanyImportDto>> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<CompanyImportDto>(stream);
                var validation = await ValidateCompanies(result.Data);
                validation.TotalRows = result.TotalRows;
                return Ok(new ApiResponse<ValidationResultDto<CompanyImportDto>> { Data = validation });
            }
            catch (Exception ex) { return Ok(new ApiResponse<ValidationResultDto<CompanyImportDto>> { Success = false, Message = ex.Message }); }
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (!await CheckPermission("addMaster")) return Forbidden();

            if (file == null || file.Length == 0)
                return Ok(new ApiResponse<object> { Success = false, Message = "No file uploaded" });

            try
            {
                using (var stream = file.OpenReadStream())
                {
                    var result = _excelService.ImportExcel<CompanyImportDto>(stream);
                    var validation = await ValidateCompanies(result.Data);
                    var newCompanies = new List<Company>();

                    foreach (var validRow in validation.Valid)
                    {
                        newCompanies.Add(new Company
                        {
                            Name = validRow.Data.Name.Trim(),
                            DivisionId = CurrentDivisionId,
                            IsActive = true,
                            CreatedAt = DateTime.Now,
                            UpdatedAt = DateTime.Now
                        });
                    }

                    if (newCompanies.Any())
                    {
                        _context.Companies.AddRange(newCompanies);
                        await _context.SaveChangesAsync();
                    }

                    var finalResult = new
                    {
                        imported = newCompanies.Count,
                        totalRows = result.TotalRows,
                        errors = validation.Invalid.Select(e => new RowError { Row = e.Row, Message = e.Message ?? "" }).ToList()
                    };

                    return Ok(new ApiResponse<object> { Data = finalResult, Message = $"{newCompanies.Count} companies imported successfully" });
                }
            }
            catch (Exception ex)
            {
                return Ok(new ApiResponse<object> { Success = false, Message = $"Import failed: {ex.Message}" });
            }
        }

        private async Task<ValidationResultDto<CompanyImportDto>> ValidateCompanies(List<ExcelRow<CompanyImportDto>> rows)
        {
            var validation = new ValidationResultDto<CompanyImportDto>();
            var existingNames = await _context.Companies
                .Where(c => c.DivisionId == CurrentDivisionId)
                .Select(c => c.Name.ToLower())
                .ToListAsync();
            var processedInFile = new HashSet<string>();

            foreach (var row in rows)
            {
                var item = row.Data;
                if (string.IsNullOrWhiteSpace(item.Name))
                {
                    validation.Invalid.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = "Name is mandatory" });
                    continue;
                }

                var nameLower = item.Name.Trim().ToLower();

                if (processedInFile.Contains(nameLower))
                {
                    validation.Duplicates.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = $"Duplicate Company Name in file: {item.Name}" });
                    continue;
                }

                if (existingNames.Contains(nameLower))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = $"Company '{item.Name}' already exists in database" });
                    processedInFile.Add(nameLower);
                    continue;
                }

                validation.Valid.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item });
                processedInFile.Add(nameLower);
            }

            return validation;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Company>>>> GetAll()
        {
            var companies = await _context.Companies
                .Where(c => c.DivisionId == CurrentDivisionId)
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Company>> { Data = companies });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Company>>>> GetActive()
        {
            var companies = await _context.Companies
                .Where(c => c.DivisionId == CurrentDivisionId && c.IsActive)
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Company>> { Data = companies });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Company>>> GetById(int id)
        {
            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.Id == id && c.DivisionId == CurrentDivisionId);
            if (company == null)
            {
                return NotFound(new ApiResponse<Company> { Success = false, Message = $"Company with ID {id} not found" });
            }
            return Ok(new ApiResponse<Company> { Data = company });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Company>>> Create([FromBody] CreateCompanyRequest request)
        {
            if (!await CheckPermission("addMaster")) return Forbidden();

            if (string.IsNullOrEmpty(request.Name))
            {
                return BadRequest(new ApiResponse<Company> { Success = false, Message = "Company name is required" });
            }

            var exists = await _context.Companies.AnyAsync(c => c.DivisionId == CurrentDivisionId && c.Name.ToLower() == request.Name.Trim().ToLower());
            if (exists)
            {
                return BadRequest(new ApiResponse<Company> { Success = false, Message = "Company name already exists" });
            }

            var company = new Company
            {
                Name = request.Name.Trim(),
                DivisionId = CurrentDivisionId,
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
            if (!await CheckPermission("editMaster")) return Forbidden();

            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.Id == id && c.DivisionId == CurrentDivisionId);
            if (company == null)
            {
                return NotFound(new ApiResponse<Company> { Success = false, Message = $"Company with ID {id} not found" });
            }

            if (!string.IsNullOrEmpty(request.Name)) 
            {
                var nameTrimmed = request.Name.Trim();
                if (await _context.Companies.AnyAsync(c => c.DivisionId == CurrentDivisionId && c.Id != id && c.Name.ToLower() == nameTrimmed.ToLower()))
                {
                    return BadRequest(new ApiResponse<Company> { Success = false, Message = "Company name already exists" });
                }
                company.Name = nameTrimmed;
            }

            if (request.IsActive.HasValue) company.IsActive = request.IsActive.Value;
            
            company.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<Company> { Data = company });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            if (!await CheckPermission("editMaster")) return Forbidden();

            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.Id == id && c.DivisionId == CurrentDivisionId);
            if (company == null)
            {
                return NotFound(new ApiResponse<bool> { Success = false, Message = $"Company with ID {id} not found" });
            }

            _context.Companies.Remove(company);
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<bool> { Data = true });
        }
        private async Task<bool> CheckPermission(string permissionKey)
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId)) return false;

            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            if (permissions == null)
            {
                var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                if (role == "QC_ADMIN") return true;
                return false;
            }

            return permissionKey switch
            {
                "addMaster" => permissions.AddMaster,
                "editMaster" => permissions.EditMaster,
                _ => false
            };
        }

        private ActionResult Forbidden()
        {
            return StatusCode(403, new ApiResponse<object> { Success = false, Message = "You do not have permission to perform this action." });
        }
    }
}
