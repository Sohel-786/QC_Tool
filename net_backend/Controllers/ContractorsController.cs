using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("contractors")]
    [ApiController]
    public class ContractorsController : DivisionIsolatedController
    {
        private readonly ApplicationDbContext _context;
        private readonly IExcelService _excelService;

        public ContractorsController(ApplicationDbContext context, IExcelService excelService, IDivisionService divisionService)
            : base(divisionService)
        {
            _context = context;
            _excelService = excelService;
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            var data = (await _context.Contractors
                .Where(c => c.DivisionId == CurrentDivisionId)
                .ToListAsync()).Select(c => new {
                Id = c.Id,
                Name = c.Name,
                PhoneNumber = c.PhoneNumber,
                IsActive = c.IsActive ? "Yes" : "No",
                CreatedAt = c.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });
            return File(_excelService.GenerateExcel(data, "Contractors"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "contractors.xlsx");
        }

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<ContractorImportDto>>>> Validate(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<ValidationResultDto<ContractorImportDto>> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<ContractorImportDto>(stream);
                var validation = await ValidateContractors(result.Data);
                validation.TotalRows = result.TotalRows;
                return Ok(new ApiResponse<ValidationResultDto<ContractorImportDto>> { Data = validation });
            }
            catch (Exception ex) { return Ok(new ApiResponse<ValidationResultDto<ContractorImportDto>> { Success = false, Message = ex.Message }); }
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<object> { Success = false, Message = "No file" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<ContractorImportDto>(stream);
                var validation = await ValidateContractors(result.Data);
                var newItems = new List<Contractor>();

                foreach (var validRow in validation.Valid)
                {
                    newItems.Add(new Contractor { 
                        Name = validRow.Data.Name.Trim(), 
                        PhoneNumber = validRow.Data.PhoneNumber.Trim(), 
                        DivisionId = CurrentDivisionId,
                        IsActive = true 
                    });
                }

                if (newItems.Any())
                {
                    _context.Contractors.AddRange(newItems);
                    await _context.SaveChangesAsync();
                }

                var finalResult = new { imported = newItems.Count, totalRows = result.TotalRows, errors = validation.Invalid.Select(e => new RowError { Row = e.Row, Message = e.Message ?? "" }).ToList() };
                return Ok(new ApiResponse<object> { Data = finalResult, Message = $"{newItems.Count} imported" });
            }
            catch (Exception ex) { return Ok(new ApiResponse<object> { Success = false, Message = ex.Message }); }
        }

        private async Task<ValidationResultDto<ContractorImportDto>> ValidateContractors(List<ExcelRow<ContractorImportDto>> rows)
        {
            var validation = new ValidationResultDto<ContractorImportDto>();
            var existingNames = await _context.Contractors
                .Where(c => c.DivisionId == CurrentDivisionId)
                .Select(c => c.Name.ToLower())
                .ToListAsync();
            var processedInFile = new HashSet<string>();

            foreach (var row in rows)
            {
                var item = row.Data;
                if (string.IsNullOrWhiteSpace(item.Name))
                {
                    validation.Invalid.Add(new ValidationEntry<ContractorImportDto> { Row = row.RowNumber, Data = item, Message = "Name is mandatory" });
                    continue;
                }
                var nameLower = item.Name.Trim().ToLower();

                if (processedInFile.Contains(nameLower))
                {
                    validation.Duplicates.Add(new ValidationEntry<ContractorImportDto> { Row = row.RowNumber, Data = item, Message = $"Duplicate Contractor Name in file: {item.Name}" });
                    continue;
                }

                if (existingNames.Contains(nameLower))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<ContractorImportDto> { Row = row.RowNumber, Data = item, Message = $"Contractor '{item.Name}' already exists" });
                    processedInFile.Add(nameLower);
                    continue;
                }

                if (string.IsNullOrWhiteSpace(item.PhoneNumber))
                {
                    validation.Invalid.Add(new ValidationEntry<ContractorImportDto> { Row = row.RowNumber, Data = item, Message = "Phone number is mandatory" });
                    continue;
                }

                if (!System.Text.RegularExpressions.Regex.IsMatch(item.PhoneNumber.Trim(), @"^[6-9]\d{9}$"))
                {
                    validation.Invalid.Add(new ValidationEntry<ContractorImportDto> { Row = row.RowNumber, Data = item, Message = "Invalid Indian mobile number" });
                    continue;
                }

                validation.Valid.Add(new ValidationEntry<ContractorImportDto> { Row = row.RowNumber, Data = item });
                processedInFile.Add(nameLower);
            }

            return validation;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Contractor>>>> GetAll() => 
            Ok(new ApiResponse<IEnumerable<Contractor>> { Data = await _context.Contractors.Where(c => c.DivisionId == CurrentDivisionId).ToListAsync() });

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Contractor>>>> GetActive() => 
            Ok(new ApiResponse<IEnumerable<Contractor>> { Data = await _context.Contractors.Where(c => c.DivisionId == CurrentDivisionId && c.IsActive).ToListAsync() });

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Contractor>>> GetById(int id)
        {
            var item = await _context.Contractors.FirstOrDefaultAsync(c => c.Id == id && c.DivisionId == CurrentDivisionId);
            return item == null ? NotFound(new ApiResponse<Contractor> { Success = false, Message = "Not found" }) : Ok(new ApiResponse<Contractor> { Data = item });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Contractor>>> Create([FromBody] CreateContractorRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new ApiResponse<Contractor> { Success = false, Message = "Name is required" });

            if (string.IsNullOrWhiteSpace(request.PhoneNumber))
                return BadRequest(new ApiResponse<Contractor> { Success = false, Message = "Phone number is required" });

            if (!System.Text.RegularExpressions.Regex.IsMatch(request.PhoneNumber.Trim(), @"^[6-9]\d{9}$"))
                return BadRequest(new ApiResponse<Contractor> { Success = false, Message = "Invalid Indian mobile number (should be 10 digits starting with 6-9)" });

            if (await _context.Contractors.AnyAsync(c => c.DivisionId == CurrentDivisionId && c.Name.ToLower() == request.Name.Trim().ToLower()))
                return BadRequest(new ApiResponse<Contractor> { Success = false, Message = "Contractor name already exists" });

            var item = new Contractor { 
                Name = request.Name.Trim(), 
                PhoneNumber = request.PhoneNumber.Trim(), 
                DivisionId = CurrentDivisionId,
                IsActive = request.IsActive ?? true 
            };
            _context.Contractors.Add(item);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<Contractor> { Data = item });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Contractor>>> Update(int id, [FromBody] CreateContractorRequest request)
        {
            var item = await _context.Contractors.FirstOrDefaultAsync(c => c.Id == id && c.DivisionId == CurrentDivisionId);
            if (item == null) return NotFound();

            if (!string.IsNullOrEmpty(request.Name))
            {
                var nameTrimmed = request.Name.Trim();
                if (await _context.Contractors.AnyAsync(c => c.DivisionId == CurrentDivisionId && c.Id != id && c.Name.ToLower() == nameTrimmed.ToLower()))
                    return BadRequest(new ApiResponse<Contractor> { Success = false, Message = "Contractor name already exists" });
                item.Name = nameTrimmed;
            }

            if (!string.IsNullOrEmpty(request.PhoneNumber))
            {
                var phoneTrimmed = request.PhoneNumber.Trim();
                if (!System.Text.RegularExpressions.Regex.IsMatch(phoneTrimmed, @"^[6-9]\d{9}$"))
                    return BadRequest(new ApiResponse<Contractor> { Success = false, Message = "Invalid Indian mobile number (should be 10 digits starting with 6-9)" });
                item.PhoneNumber = phoneTrimmed;
            }

            if (request.IsActive.HasValue) item.IsActive = request.IsActive.Value;
            item.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Contractor> { Data = item });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            var item = await _context.Contractors.FirstOrDefaultAsync(c => c.Id == id && c.DivisionId == CurrentDivisionId);
            if (item == null) return NotFound();
            _context.Contractors.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
