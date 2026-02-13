using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("locations")]
    [ApiController]
    public class LocationsController : DivisionIsolatedController
    {
        private readonly ApplicationDbContext _context;
        private readonly IExcelService _excelService;
        public LocationsController(ApplicationDbContext context, IExcelService excelService, IDivisionService divisionService)
            : base(divisionService)
        {
            _context = context;
            _excelService = excelService;
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            var data = (await _context.Locations
                .Include(l => l.Company)
                .Where(l => l.DivisionId == CurrentDivisionId)
                .ToListAsync()).Select(c => new {
                Id = c.Id,
                Name = c.Name,
                Company = c.Company?.Name ?? "—",
                IsActive = c.IsActive ? "Yes" : "No",
                CreatedAt = c.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });
            return File(_excelService.GenerateExcel(data, "Locations"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "locations.xlsx");
        }

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<LocationImportDto>>>> Validate(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<ValidationResultDto<LocationImportDto>> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<LocationImportDto>(stream);
                var validation = await ValidateLocations(result.Data);
                validation.TotalRows = result.TotalRows;
                return Ok(new ApiResponse<ValidationResultDto<LocationImportDto>> { Data = validation });
            }
            catch (Exception ex) { return Ok(new ApiResponse<ValidationResultDto<LocationImportDto>> { Success = false, Message = ex.Message }); }
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (!await CheckPermission("addMaster")) return Forbidden();

            if (file == null || file.Length == 0) return Ok(new ApiResponse<object> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<LocationImportDto>(stream);
                var validation = await ValidateLocations(result.Data);
                var newItems = new List<Location>();

                var companies = await _context.Companies
                    .Where(c => c.DivisionId == CurrentDivisionId)
                    .ToDictionaryAsync(c => c.Name.Trim().ToLower(), c => c.Id);

                foreach (var validRow in validation.Valid)
                {
                    var dto = validRow.Data;
                    if (companies.TryGetValue(dto.CompanyName.Trim().ToLower(), out var companyId))
                    {
                        var isActive = true;
                        if (!string.IsNullOrEmpty(dto.IsActive))
                        {
                            var statusStr = dto.IsActive.Trim().ToLower();
                            isActive = statusStr == "yes" || statusStr == "true" || statusStr == "1" || statusStr == "active";
                        }

                        newItems.Add(new Location 
                        { 
                            Name = dto.Name.Trim(), 
                            CompanyId = companyId,
                            IsActive = isActive,
                            DivisionId = CurrentDivisionId
                        });
                    }
                }

                if (newItems.Any())
                {
                    _context.Locations.AddRange(newItems);
                    await _context.SaveChangesAsync();
                }

                var finalResult = new { imported = newItems.Count, totalRows = result.TotalRows, errors = validation.Invalid.Select(e => new RowError { Row = e.Row, Message = e.Message ?? "" }).ToList() };
                return Ok(new ApiResponse<object> { Data = finalResult, Message = $"{newItems.Count} imported" });
            }
            catch (Exception ex) { return Ok(new ApiResponse<object> { Success = false, Message = ex.Message }); }
        }

        private async Task<ValidationResultDto<LocationImportDto>> ValidateLocations(List<ExcelRow<LocationImportDto>> rows)
        {
            var validation = new ValidationResultDto<LocationImportDto>();
            var companies = await _context.Companies
                .Where(c => c.DivisionId == CurrentDivisionId)
                .ToDictionaryAsync(c => c.Name.Trim().ToLower(), c => c);
            
            var existingLocations = await _context.Locations
                .Where(l => l.DivisionId == CurrentDivisionId)
                .Select(l => new { l.Name, l.CompanyId })
                .ToListAsync();
            
            var existingMap = new HashSet<string>(existingLocations.Select(l => $"{l.Name.Trim().ToLower()}_{l.CompanyId}"));
            var processedInFile = new HashSet<string>();

            foreach (var row in rows)
            {
                var item = row.Data;
                if (string.IsNullOrWhiteSpace(item.Name))
                {
                    validation.Invalid.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item, Message = "Name is mandatory" });
                    continue;
                }

                if (string.IsNullOrWhiteSpace(item.CompanyName))
                {
                    validation.Invalid.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item, Message = "Company Name is mandatory" });
                    continue;
                }

                if (!companies.TryGetValue(item.CompanyName.Trim().ToLower(), out var company))
                {
                    validation.Invalid.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item, Message = $"Company '{item.CompanyName}' not found" });
                    continue;
                }

                var nameLower = item.Name.Trim().ToLower();
                var companyId = company.Id;

                var fileKey = $"{nameLower}_{companyId}";
                if (processedInFile.Contains(fileKey))
                {
                    validation.Duplicates.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item, Message = $"Duplicate Location Name '{item.Name}' for Company '{company.Name}' in file" });
                    continue;
                }

                if (existingMap.Contains(fileKey))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item, Message = $"Location '{item.Name}' already exists for Company '{company.Name}'" });
                    processedInFile.Add(fileKey);
                    continue;
                }

                validation.Valid.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item });
                processedInFile.Add(fileKey);
            }

            return validation;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Location>>>> GetAll() => 
            Ok(new ApiResponse<IEnumerable<Location>> { Data = await _context.Locations.Include(l => l.Company).Where(l => l.DivisionId == CurrentDivisionId).ToListAsync() });

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Location>>>> GetActive() => 
            Ok(new ApiResponse<IEnumerable<Location>> { Data = await _context.Locations.Include(l => l.Company).Where(c => c.IsActive && c.DivisionId == CurrentDivisionId).ToListAsync() });

        [HttpGet("company/{companyId}")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Location>>>> GetByCompany(int companyId) => 
            Ok(new ApiResponse<IEnumerable<Location>> { Data = await _context.Locations.Where(l => l.CompanyId == companyId && l.IsActive && l.DivisionId == CurrentDivisionId).ToListAsync() });

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Location>>> GetById(int id)
        {
            var item = await _context.Locations.FirstOrDefaultAsync(l => l.Id == id && l.DivisionId == CurrentDivisionId);
            return item == null ? NotFound() : Ok(new ApiResponse<Location> { Data = item });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Location>>> Create([FromBody] CreateLocationRequest request)
        {
            if (!await CheckPermission("addMaster")) return Forbidden();

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new ApiResponse<Location> { Success = false, Message = "Name is required" });
            
            if (request.CompanyId <= 0)
                return BadRequest(new ApiResponse<Location> { Success = false, Message = "Company is required" });

            if (await _context.Locations.AnyAsync(l => l.DivisionId == CurrentDivisionId && l.CompanyId == request.CompanyId && l.Name.ToLower() == request.Name.Trim().ToLower()))
                return BadRequest(new ApiResponse<Location> { Success = false, Message = "Location name already exists for this company" });

            var item = new Location 
            { 
                Name = request.Name.Trim(), 
                CompanyId = request.CompanyId,
                IsActive = request.IsActive ?? true,
                DivisionId = CurrentDivisionId
            };
            _context.Locations.Add(item);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<Location> { Data = item });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Location>>> Update(int id, [FromBody] CreateLocationRequest request)
        {
            if (!await CheckPermission("editMaster")) return Forbidden();

            var item = await _context.Locations.FirstOrDefaultAsync(l => l.Id == id && l.DivisionId == CurrentDivisionId);
            if (item == null) return NotFound();

            string newName = item.Name;
            int newCompanyId = item.CompanyId;
            bool checkDuplicate = false;

            if (!string.IsNullOrEmpty(request.Name)) 
            {
                newName = request.Name.Trim();
                checkDuplicate = true;
            }
            if (request.CompanyId > 0) 
            {
                newCompanyId = request.CompanyId;
                checkDuplicate = true;
            }

            if (checkDuplicate)
            {
                if (await _context.Locations.AnyAsync(l => l.DivisionId == CurrentDivisionId && l.Id != id && l.CompanyId == newCompanyId && l.Name.ToLower() == newName.ToLower()))
                    return BadRequest(new ApiResponse<Location> { Success = false, Message = "Location name already exists for this company" });
            }

            if (!string.IsNullOrEmpty(request.Name)) item.Name = request.Name.Trim();
            if (request.CompanyId > 0) item.CompanyId = request.CompanyId;
            if (request.IsActive.HasValue) item.IsActive = request.IsActive.Value;
            item.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Location> { Data = item });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            if (!await CheckPermission("editMaster")) return Forbidden();

            var item = await _context.Locations.FirstOrDefaultAsync(l => l.Id == id && l.DivisionId == CurrentDivisionId);
            if (item == null) return NotFound();

            // Check if in use
            var inUse = await _context.Issues.AnyAsync(i => i.LocationId == id);
            if (inUse)
            {
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Location is in use and cannot be deleted." });
            }

            _context.Locations.Remove(item);
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
