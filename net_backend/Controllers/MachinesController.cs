using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("machines")]
    [ApiController]
    public class MachinesController : DivisionIsolatedController
    {
        private readonly ApplicationDbContext _context;
        private readonly IExcelService _excelService;
        public MachinesController(ApplicationDbContext context, IExcelService excelService, IDivisionService divisionService)
            : base(divisionService)
        {
            _context = context;
            _excelService = excelService;
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            var data = (await _context.Machines
                .Include(m => m.Contractor)
                .Where(m => m.DivisionId == CurrentDivisionId)
                .ToListAsync()).Select(c => new {
                Id = c.Id,
                Name = c.Name,
                Contractor = c.Contractor?.Name ?? "—",
                IsActive = c.IsActive ? "Yes" : "No",
                CreatedAt = c.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });
            return File(_excelService.GenerateExcel(data, "Machines"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "machines.xlsx");
        }

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<MachineImportDto>>>> Validate(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<ValidationResultDto<MachineImportDto>> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<MachineImportDto>(stream);
                var validation = await ValidateMachines(result.Data);
                validation.TotalRows = result.TotalRows;
                return Ok(new ApiResponse<ValidationResultDto<MachineImportDto>> { Data = validation });
            }
            catch (Exception ex) { return Ok(new ApiResponse<ValidationResultDto<MachineImportDto>> { Success = false, Message = ex.Message }); }
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (!await CheckPermission("addMaster")) return Forbidden();

            if (file == null || file.Length == 0) return Ok(new ApiResponse<object> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<MachineImportDto>(stream);
                var validation = await ValidateMachines(result.Data);
                var newItems = new List<Machine>();

                var contractors = await _context.Contractors
                    .Where(c => c.DivisionId == CurrentDivisionId)
                    .ToDictionaryAsync(c => c.Name.Trim().ToLower(), c => c.Id);

                foreach (var validRow in validation.Valid)
                {
                    var dto = validRow.Data;
                    if (contractors.TryGetValue(dto.ContractorName.Trim().ToLower(), out var contractorId))
                    {
                        var isActive = true;
                        if (!string.IsNullOrEmpty(dto.IsActive))
                        {
                            var statusStr = dto.IsActive.Trim().ToLower();
                            isActive = statusStr == "yes" || statusStr == "true" || statusStr == "1" || statusStr == "active";
                        }

                        newItems.Add(new Machine 
                        { 
                            Name = dto.Name.Trim(), 
                            ContractorId = contractorId,
                            IsActive = isActive,
                            DivisionId = CurrentDivisionId,
                            CreatedAt = DateTime.Now,
                            UpdatedAt = DateTime.Now
                        });
                    }
                }

                if (newItems.Any())
                {
                    _context.Machines.AddRange(newItems);
                    await _context.SaveChangesAsync();
                }

                var finalResult = new { imported = newItems.Count, totalRows = result.TotalRows, errors = validation.Invalid.Select(e => new RowError { Row = e.Row, Message = e.Message ?? "" }).ToList() };
                return Ok(new ApiResponse<object> { Data = finalResult, Message = $"{newItems.Count} imported" });
            }
            catch (Exception ex) { return Ok(new ApiResponse<object> { Success = false, Message = ex.Message }); }
        }

        private async Task<ValidationResultDto<MachineImportDto>> ValidateMachines(List<ExcelRow<MachineImportDto>> rows)
        {
            var validation = new ValidationResultDto<MachineImportDto>();
            var contractors = await _context.Contractors
                .Where(c => c.DivisionId == CurrentDivisionId)
                .ToDictionaryAsync(c => c.Name.Trim().ToLower(), c => c);

            var existingMachines = await _context.Machines
                .Where(m => m.DivisionId == CurrentDivisionId)
                .Select(m => new { m.Name, m.ContractorId })
                .ToListAsync();

            var existingMap = new HashSet<string>(existingMachines.Select(m => $"{m.Name.Trim().ToLower()}_{m.ContractorId}"));
            var processedInFile = new HashSet<string>();

            foreach (var row in rows)
            {
                var item = row.Data;
                if (string.IsNullOrWhiteSpace(item.Name))
                {
                    validation.Invalid.Add(new ValidationEntry<MachineImportDto> { Row = row.RowNumber, Data = item, Message = "Name is mandatory" });
                    continue;
                }

                if (string.IsNullOrWhiteSpace(item.ContractorName))
                {
                    validation.Invalid.Add(new ValidationEntry<MachineImportDto> { Row = row.RowNumber, Data = item, Message = "Contractor Name is mandatory" });
                    continue;
                }

                if (!contractors.TryGetValue(item.ContractorName.Trim().ToLower(), out var contractor))
                {
                    validation.Invalid.Add(new ValidationEntry<MachineImportDto> { Row = row.RowNumber, Data = item, Message = $"Contractor '{item.ContractorName}' not found" });
                    continue;
                }

                var nameLower = item.Name.Trim().ToLower();
                var contractorId = contractor.Id;
                var fileKey = $"{nameLower}_{contractorId}";

                if (processedInFile.Contains(fileKey))
                {
                    validation.Duplicates.Add(new ValidationEntry<MachineImportDto> { Row = row.RowNumber, Data = item, Message = $"Duplicate Machine Name '{item.Name}' for Contractor '{contractor.Name}' in file" });
                    continue;
                }

                if (existingMap.Contains(fileKey))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<MachineImportDto> { Row = row.RowNumber, Data = item, Message = $"Machine '{item.Name}' already exists for Contractor '{contractor.Name}'" });
                    processedInFile.Add(fileKey);
                    continue;
                }

                validation.Valid.Add(new ValidationEntry<MachineImportDto> { Row = row.RowNumber, Data = item });
                processedInFile.Add(fileKey);
            }

            return validation;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Machine>>>> GetAll() => 
            Ok(new ApiResponse<IEnumerable<Machine>> { Data = await _context.Machines.Include(m => m.Contractor).Where(m => m.DivisionId == CurrentDivisionId).ToListAsync() });

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Machine>>>> GetActive() => 
            Ok(new ApiResponse<IEnumerable<Machine>> { Data = await _context.Machines.Include(m => m.Contractor).Where(c => c.IsActive && c.DivisionId == CurrentDivisionId).ToListAsync() });

        [HttpGet("contractor/{contractorId}")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Machine>>>> GetByContractor(int contractorId) => 
            Ok(new ApiResponse<IEnumerable<Machine>> { Data = await _context.Machines.Where(m => m.ContractorId == contractorId && m.IsActive && m.DivisionId == CurrentDivisionId).ToListAsync() });

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Machine>>> GetById(int id)
        {
            var item = await _context.Machines.FirstOrDefaultAsync(m => m.Id == id && m.DivisionId == CurrentDivisionId);
            return item == null ? NotFound() : Ok(new ApiResponse<Machine> { Data = item });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Machine>>> Create([FromBody] CreateMachineRequest request)
        {
            if (!await CheckPermission("addMaster")) return Forbidden();

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new ApiResponse<Machine> { Success = false, Message = "Name is required" });

            if (request.ContractorId <= 0)
                return BadRequest(new ApiResponse<Machine> { Success = false, Message = "Contractor is required" });

            if (await _context.Machines.AnyAsync(m => m.DivisionId == CurrentDivisionId && m.ContractorId == request.ContractorId && m.Name.ToLower() == request.Name.Trim().ToLower()))
                return BadRequest(new ApiResponse<Machine> { Success = false, Message = "Machine name already exists for this contractor" });

            var item = new Machine 
            { 
                Name = request.Name.Trim(), 
                ContractorId = request.ContractorId,
                IsActive = request.IsActive ?? true,
                DivisionId = CurrentDivisionId
            };
            _context.Machines.Add(item);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<Machine> { Data = item });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Machine>>> Update(int id, [FromBody] CreateMachineRequest request)
        {
            if (!await CheckPermission("editMaster")) return Forbidden();

            var item = await _context.Machines.FirstOrDefaultAsync(m => m.Id == id && m.DivisionId == CurrentDivisionId);
            if (item == null) return NotFound();

            string newName = item.Name;
            int newContractorId = item.ContractorId;
            bool checkDuplicate = false;

            if (!string.IsNullOrEmpty(request.Name))
            {
                newName = request.Name.Trim();
                checkDuplicate = true;
            }
            if (request.ContractorId > 0)
            {
                newContractorId = request.ContractorId;
                checkDuplicate = true;
            }

            if (checkDuplicate)
            {
                if (await _context.Machines.AnyAsync(m => m.DivisionId == CurrentDivisionId && m.Id != id && m.ContractorId == newContractorId && m.Name.ToLower() == newName.ToLower()))
                    return BadRequest(new ApiResponse<Machine> { Success = false, Message = "Machine name already exists for this contractor" });
            }

            if (!string.IsNullOrEmpty(request.Name)) item.Name = request.Name.Trim();
            if (request.ContractorId > 0) item.ContractorId = request.ContractorId;
            if (request.IsActive.HasValue) item.IsActive = request.IsActive.Value;
            item.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Machine> { Data = item });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            if (!await CheckPermission("editMaster")) return Forbidden();

            var item = await _context.Machines.FirstOrDefaultAsync(m => m.Id == id && m.DivisionId == CurrentDivisionId);
            if (item == null) return NotFound();

            // Check if in use
            var inUse = await _context.Issues.AnyAsync(i => i.MachineId == id);
            if (inUse)
            {
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Machine is in use and cannot be deleted." });
            }

            _context.Machines.Remove(item);
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
