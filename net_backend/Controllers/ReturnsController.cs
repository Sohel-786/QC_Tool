using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;
using net_backend.Utils;

namespace net_backend.Controllers
{
    [Route("returns")]
    [ApiController]
    public class ReturnsController : DivisionIsolatedController
    {
        private readonly ApplicationDbContext _context;
        private readonly ICodeGeneratorService _codeGenerator;

        public ReturnsController(ApplicationDbContext context, ICodeGeneratorService codeGenerator, IDivisionService divisionService)
            : base(divisionService)
        {
            _context = context;
            _codeGenerator = codeGenerator;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Return>>>> GetAll(
            [FromQuery] string? status,
            [FromQuery] string? companyIds,
            [FromQuery] string? contractorIds,
            [FromQuery] string? machineIds,
            [FromQuery] string? locationIds,
            [FromQuery] string? itemIds,
            [FromQuery] string? conditions,
            [FromQuery] string? operatorName,
            [FromQuery] string? receivedBy,
            [FromQuery] string? search,
            [FromQuery] bool? hideIssuedItems)
        {
            var query = _context.Returns
                .Where(r => r.DivisionId == CurrentDivisionId)
                .Include(r => r.Issue).ThenInclude(i => i.Item)
                .Include(r => r.Issue).ThenInclude(i => i.Company)
                .Include(r => r.Issue).ThenInclude(i => i.Contractor)
                .Include(r => r.Issue).ThenInclude(i => i.Machine)
                .Include(r => r.Issue).ThenInclude(i => i.Location)
                .Include(r => r.Item)
                .Include(r => r.ReturnedByUser)
                .Include(r => r.Company)
                .Include(r => r.Contractor)
                .Include(r => r.Machine)
                .Include(r => r.Location)
                .Include(r => r.Status)
                .AsQueryable();

            // Status filter
            if (!string.IsNullOrEmpty(status))
            {
                if (status == "active") query = query.Where(r => r.IsActive);
                else if (status == "inactive") query = query.Where(r => !r.IsActive);
            }

            // Multi-select filters
            if (!string.IsNullOrEmpty(companyIds))
            {
                var ids = companyIds.Split(',').Select(id => int.TryParse(id.Trim(), out var n) ? n : 0).Where(n => n > 0).ToList();
                if (ids.Any())
                {
                    query = query.Where(r =>
                        (r.CompanyId.HasValue && ids.Contains(r.CompanyId.Value)) ||
                        (r.Issue != null && ids.Contains(r.Issue.CompanyId))
                    );
                }
            }

            if (!string.IsNullOrEmpty(contractorIds))
            {
                var ids = contractorIds.Split(',').Select(id => int.TryParse(id.Trim(), out var n) ? n : 0).Where(n => n > 0).ToList();
                if (ids.Any())
                {
                    query = query.Where(r =>
                        (r.ContractorId.HasValue && ids.Contains(r.ContractorId.Value)) ||
                        (r.Issue != null && ids.Contains(r.Issue.ContractorId))
                    );
                }
            }

            if (!string.IsNullOrEmpty(machineIds))
            {
                var ids = machineIds.Split(',').Select(id => int.TryParse(id.Trim(), out var n) ? n : 0).Where(n => n > 0).ToList();
                if (ids.Any())
                {
                    query = query.Where(r =>
                        (r.MachineId.HasValue && ids.Contains(r.MachineId.Value)) ||
                        (r.Issue != null && ids.Contains(r.Issue.MachineId))
                    );
                }
            }

            if (!string.IsNullOrEmpty(locationIds))
            {
                var ids = locationIds.Split(',').Select(id => int.TryParse(id.Trim(), out var n) ? n : 0).Where(n => n > 0).ToList();
                if (ids.Any())
                {
                    query = query.Where(r =>
                        (r.LocationId.HasValue && ids.Contains(r.LocationId.Value)) ||
                        (r.Issue != null && ids.Contains(r.Issue.LocationId))
                    );
                }
            }

            if (!string.IsNullOrEmpty(itemIds))
            {
                var ids = itemIds.Split(',').Select(id => int.TryParse(id.Trim(), out var n) ? n : 0).Where(n => n > 0).ToList();
                if (ids.Any())
                {
                    query = query.Where(r =>
                        (r.ItemId.HasValue && ids.Contains(r.ItemId.Value)) ||
                        (r.Issue != null && ids.Contains(r.Issue.ItemId))
                    );
                }
            }

            if (!string.IsNullOrEmpty(conditions))
            {
                var validConditions = new[] { "OK", "Damaged", "Calibration Required", "Missing" };
                var conditionList = conditions.Split(',').Select(c => c.Trim()).Where(c => validConditions.Contains(c)).ToList();
                if (conditionList.Any())
                {
                    query = query.Where(r => conditionList.Contains(r.Condition));
                }
            }

            if (!string.IsNullOrEmpty(operatorName))
            {
                var searchTerm = operatorName.Trim();
                query = query.Where(r => 
                    (r.Issue != null && r.Issue.IssuedTo != null && r.Issue.IssuedTo.Contains(searchTerm)) ||
                    (r.ReceivedBy != null && r.ReceivedBy.Contains(searchTerm))
                );
            }

            if (!string.IsNullOrEmpty(receivedBy))
            {
                var searchTerm = receivedBy.Trim();
                query = query.Where(r => r.ReceivedBy != null && r.ReceivedBy.Contains(searchTerm));
            }

            if (!string.IsNullOrEmpty(search))
            {
                var searchTerm = search.Trim();
                query = query.Where(r =>
                    (r.ReturnCode != null && r.ReturnCode.Contains(searchTerm)) ||
                    r.Condition.Contains(searchTerm) ||
                    (r.Issue != null && r.Issue.IssueNo.Contains(searchTerm)) ||
                    (r.Issue != null && r.Issue.Item != null && (r.Issue.Item.ItemName.Contains(searchTerm) || (r.Issue.Item.SerialNumber != null && r.Issue.Item.SerialNumber.Contains(searchTerm)))) ||
                    (r.Item != null && (r.Item.ItemName.Contains(searchTerm) || (r.Item.SerialNumber != null && r.Item.SerialNumber.Contains(searchTerm)))) ||
                    (r.Issue != null && r.Issue.Company != null && r.Issue.Company.Name.Contains(searchTerm)) ||
                    (r.Issue != null && r.Issue.Contractor != null && r.Issue.Contractor.Name.Contains(searchTerm)) ||
                    (r.Issue != null && r.Issue.Machine != null && r.Issue.Machine.Name.Contains(searchTerm)) ||
                    (r.Issue != null && r.Issue.Location != null && r.Issue.Location.Name.Contains(searchTerm)) ||
                    (r.Company != null && r.Company.Name.Contains(searchTerm)) ||
                    (r.Contractor != null && r.Contractor.Name.Contains(searchTerm)) ||
                    (r.Machine != null && r.Machine.Name.Contains(searchTerm)) ||
                    (r.Location != null && r.Location.Name.Contains(searchTerm)) ||
                    (r.Status != null && r.Status.Name.Contains(searchTerm)) ||
                    (r.Issue != null && r.Issue.IssuedTo != null && r.Issue.IssuedTo.Contains(searchTerm)) ||
                    (r.ReceivedBy != null && r.ReceivedBy.Contains(searchTerm))
                );
            }

            if (hideIssuedItems.HasValue && hideIssuedItems.Value)
            {
                var latestIssueIds = await _context.Issues
                    .Where(i => i.DivisionId == CurrentDivisionId && i.IsActive)
                    .GroupBy(i => i.ItemId)
                    .Select(g => g.OrderByDescending(i => i.Id).First().Id)
                    .ToListAsync();

                query = query.Where(r => r.IssueId == null || latestIssueIds.Contains(r.IssueId.Value));
            }

            var returns = await query.OrderByDescending(r => r.ReturnedAt).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Return>> { Data = returns });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Return>>> GetById(int id)
        {
            var ret = await _context.Returns
                .Include(r => r.Issue).ThenInclude(i => i.Item)
                .Include(r => r.Issue).ThenInclude(i => i.Company)
                .Include(r => r.Issue).ThenInclude(i => i.Contractor)
                .Include(r => r.Issue).ThenInclude(i => i.Machine)
                .Include(r => r.Issue).ThenInclude(i => i.Location)
                .Include(r => r.Item)
                .Include(r => r.ReturnedByUser)
                .Include(r => r.Company)
                .Include(r => r.Contractor)
                .Include(r => r.Machine)
                .Include(r => r.Location)
                .Include(r => r.Status)
                .FirstOrDefaultAsync(r => r.Id == id && r.DivisionId == CurrentDivisionId);
            if (ret == null) return NotFound();
            return Ok(new ApiResponse<Return> { Data = ret });
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<object>>> GetNextCode()
        {
            var count = await _context.Returns.CountAsync(r => r.DivisionId == CurrentDivisionId);
            var nextCode = _codeGenerator.GenerateNextCode("INWARD", count, CurrentDivisionName);
            return Ok(new ApiResponse<object> { Data = new { nextCode } });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Return>>> Create([FromForm] CreateReturnRequest request, IFormFile? image)
        {
            if (!await CheckPermission("addInward")) return Forbidden();

            if (request.IssueId.HasValue && request.ItemId.HasValue)
            {
                return BadRequest(new ApiResponse<Return> { Success = false, Message = "Choose either Outward (Issue) or Missing item, not both" });
            }

            if (!request.IssueId.HasValue && !request.ItemId.HasValue)
            {
                return BadRequest(new ApiResponse<Return> { Success = false, Message = "Either Issue No (Outward) or Missing item is required" });
            }

            if (request.IssueId.HasValue)
            {
                var existingActiveReturn = await _context.Returns
                    .AnyAsync(r => r.DivisionId == CurrentDivisionId && r.IssueId == request.IssueId && r.IsActive);
                
                if (existingActiveReturn)
                {
                    return BadRequest(new ApiResponse<Return> { Success = false, Message = "An active inward entry already exists for this outward entry. Please inactivate the existing inward entry first." });
                }
            }
            else if (request.ItemId.HasValue)
            {
                var item = await _context.Items
                    .FirstOrDefaultAsync(i => i.Id == request.ItemId && i.DivisionId == CurrentDivisionId);
                if (item == null)
                {
                    return NotFound(new ApiResponse<Return> { Success = false, Message = "Item not found" });
                }

                if (item.Status != ItemStatus.MISSING)
                {
                    return BadRequest(new ApiResponse<Return> { Success = false, Message = "Selected item is not in Missing status. Use Outward return for issued items." });
                }
            }

            var count = await _context.Returns.CountAsync(r => r.DivisionId == CurrentDivisionId);
            var returnCode = _codeGenerator.GenerateNextCode("INWARD", count, CurrentDivisionName);

            string? imagePath = null;
            if (image != null)
            {
                string serialNumber = "unknown";
                if (request.IssueId.HasValue)
                {
                    var issueForSerial = await _context.Issues
                        .Include(i => i.Item)
                        .FirstOrDefaultAsync(i => i.Id == request.IssueId && i.DivisionId == CurrentDivisionId);
                    if (issueForSerial?.Item != null) serialNumber = issueForSerial.Item.SerialNumber;
                }
                else if (request.ItemId.HasValue)
                {
                     var itemForSerial = await _context.Items
                         .FirstOrDefaultAsync(i => i.Id == request.ItemId && i.DivisionId == CurrentDivisionId);
                     if (itemForSerial != null) serialNumber = itemForSerial.SerialNumber;
                }

                var safeSerial = PathUtils.SanitizeSerialForPath(serialNumber);
                var ext = Path.GetExtension(image.FileName);
                var fileName = request.IssueId.HasValue 
                    ? $"inward-issue-{request.IssueId}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{ext}"
                    : $"inward-missing-{request.ItemId}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{ext}";

                var uploads = Path.Combine(Directory.GetCurrentDirectory(), PathUtils.GetInwardFolderPath(CurrentDivisionName, serialNumber));
                Directory.CreateDirectory(uploads);
                
                var filePath = Path.Combine(uploads, fileName);
                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await image.CopyToAsync(fileStream);
                }
                
                imagePath = PathUtils.GetInwardRelativePath(CurrentDivisionName, serialNumber, fileName);
            }

            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var currentUserId = int.TryParse(userIdStr, out var uId) ? uId : 1;

            var ret = new Return
            {
                ReturnCode = returnCode,
                DivisionId = CurrentDivisionId,
                IssueId = request.IssueId,
                ItemId = request.ItemId,
                Condition = request.Condition,
                ReturnedBy = currentUserId,
                Remarks = request.Remarks,
                ReceivedBy = request.ReceivedBy,
                StatusId = request.StatusId,
                ReturnImage = imagePath,
                CompanyId = request.CompanyId,
                ContractorId = request.ContractorId,
                MachineId = request.MachineId,
                LocationId = request.LocationId,
                ReturnedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.Returns.Add(ret);

            if (request.IssueId.HasValue)
            {
                var issue = await _context.Issues
                    .FirstOrDefaultAsync(i => i.Id == request.IssueId && i.DivisionId == CurrentDivisionId);
                if (issue != null)
                {
                    issue.IsReturned = true;
                    var item = await _context.Items
                        .FirstOrDefaultAsync(i => i.Id == issue.ItemId && i.DivisionId == CurrentDivisionId);
                    if (item != null)
                    {
                        item.Status = request.Condition.Equals("Missing", StringComparison.OrdinalIgnoreCase) ? ItemStatus.MISSING : ItemStatus.AVAILABLE;
                    }
                }
            }
            else if (request.ItemId.HasValue)
            {
                var item = await _context.Items
                    .FirstOrDefaultAsync(i => i.Id == request.ItemId && i.DivisionId == CurrentDivisionId);
                if (item != null)
                {
                    item.Status = request.Condition.Equals("Missing", StringComparison.OrdinalIgnoreCase) ? ItemStatus.MISSING : ItemStatus.AVAILABLE;
                }
            }

            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<Return> { Data = ret });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Return>>> Update(int id, [FromBody] UpdateReturnRequest request)
        {
            if (!await CheckPermission("editInward")) return Forbidden();

            var ret = await _context.Returns
                .FirstOrDefaultAsync(r => r.Id == id && r.DivisionId == CurrentDivisionId);
            if (ret == null) return NotFound(new ApiResponse<Return> { Success = false, Message = "Return record not found" });

            if (request.Remarks != null) ret.Remarks = request.Remarks;
            if (request.ReceivedBy != null) ret.ReceivedBy = request.ReceivedBy;
            if (request.StatusId.HasValue) ret.StatusId = request.StatusId.Value;
            if (request.Condition != null) ret.Condition = request.Condition;
            
            if (request.CompanyId.HasValue) ret.CompanyId = request.CompanyId;
            if (request.ContractorId.HasValue) ret.ContractorId = request.ContractorId;
            if (request.MachineId.HasValue) ret.MachineId = request.MachineId;
            if (request.LocationId.HasValue) ret.LocationId = request.LocationId;

            ret.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            if (request.Condition != null)
            {
                if (ret.IssueId.HasValue)
                {
                    var issue = await _context.Issues
                        .FirstOrDefaultAsync(i => i.Id == ret.IssueId && i.DivisionId == CurrentDivisionId);
                    if (issue != null)
                    {
                        var item = await _context.Items
                            .FirstOrDefaultAsync(i => i.Id == issue.ItemId && i.DivisionId == CurrentDivisionId);
                        if (item != null)
                        {
                            item.Status = request.Condition.Equals("Missing", StringComparison.OrdinalIgnoreCase) ? ItemStatus.MISSING : ItemStatus.AVAILABLE;
                        }
                    }
                }
                else if (ret.ItemId.HasValue)
                {
                    var item = await _context.Items
                        .FirstOrDefaultAsync(i => i.Id == ret.ItemId && i.DivisionId == CurrentDivisionId);
                    if (item != null)
                    {
                        item.Status = request.Condition.Equals("Missing", StringComparison.OrdinalIgnoreCase) ? ItemStatus.MISSING : ItemStatus.AVAILABLE;
                    }
                }
                await _context.SaveChangesAsync();
            }

            return Ok(new ApiResponse<Return> { Data = ret });
        }

        [HttpPatch("{id}/inactive")]
        [HttpPost("{id}/inactive")] 
        public async Task<ActionResult<ApiResponse<Return>>> MarkInactive(int id)
        {
            var ret = await _context.Returns
                .Include(r => r.Issue).ThenInclude(i => i.Item)
                .Include(r => r.Issue).ThenInclude(i => i.Company)
                .Include(r => r.Issue).ThenInclude(i => i.Contractor)
                .Include(r => r.Issue).ThenInclude(i => i.Machine)
                .Include(r => r.Issue).ThenInclude(i => i.Location)
                .Include(r => r.Item)
                .FirstOrDefaultAsync(r => r.Id == id && r.DivisionId == CurrentDivisionId);

            if (ret == null) return NotFound(new ApiResponse<Return> { Success = false, Message = "Return record not found" });

            ret.IsActive = false;
            ret.UpdatedAt = DateTime.Now;

            if (ret.Issue != null)
            {
                ret.Issue.IsReturned = false;
            }

            if (ret.Item != null)
            {
                ret.Item.Status = ItemStatus.ISSUED;
            }
            else if (ret.Issue != null)
            {
                 var item = await _context.Items
                     .FirstOrDefaultAsync(i => i.Id == ret.Issue.ItemId && i.DivisionId == CurrentDivisionId);
                 if (item != null) item.Status = ItemStatus.ISSUED;
            }

            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<Return> { Data = ret });
        }

        [HttpPatch("{id}/active")]
        [HttpPost("{id}/active")]
        public async Task<ActionResult<ApiResponse<Return>>> MarkActive(int id)
        {
            if (User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value != "QC_ADMIN") return Forbidden();

            var ret = await _context.Returns
                .Include(r => r.Issue).ThenInclude(i => i.Item)
                .Include(r => r.Issue).ThenInclude(i => i.Company)
                .Include(r => r.Issue).ThenInclude(i => i.Contractor)
                .Include(r => r.Issue).ThenInclude(i => i.Machine)
                .Include(r => r.Issue).ThenInclude(i => i.Location)
                .Include(r => r.Item)
                .FirstOrDefaultAsync(r => r.Id == id && r.DivisionId == CurrentDivisionId);

            if (ret == null) return NotFound(new ApiResponse<Return> { Success = false, Message = "Return record not found" });

            if (ret.IssueId.HasValue)
            {
                var otherActiveReturn = await _context.Returns
                    .AnyAsync(r => r.DivisionId == CurrentDivisionId && r.IssueId == ret.IssueId && r.IsActive && r.Id != id);

                if (otherActiveReturn)
                {
                    return BadRequest(new ApiResponse<Return> { Success = false, Message = "Another inward entry is already active for this outward entry. Please inactivate it before reactivating this one." });
                }
            }

            ret.IsActive = true;
            ret.UpdatedAt = DateTime.Now;

            if (ret.Issue != null)
            {
                ret.Issue.IsReturned = true;
            }

            if (ret.Item != null)
            {
                 ret.Item.Status = ret.Condition.Equals("Missing", StringComparison.OrdinalIgnoreCase) ? ItemStatus.MISSING : ItemStatus.AVAILABLE;
            }
             else if (ret.Issue != null)
            {
                 var item = await _context.Items
                     .FirstOrDefaultAsync(i => i.Id == ret.Issue.ItemId && i.DivisionId == CurrentDivisionId);
                 if (item != null) 
                 {
                    item.Status = ret.Condition.Equals("Missing", StringComparison.OrdinalIgnoreCase) ? ItemStatus.MISSING : ItemStatus.AVAILABLE;
                 }
            }

            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<Return> { Data = ret });
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
                "addInward" => permissions.AddInward,
                "editInward" => permissions.EditInward,
                _ => false
            };
        }

        private ActionResult Forbidden()
        {
            return StatusCode(403, new ApiResponse<object> { Success = false, Message = "You do not have permission to perform this action." });
        }
    }
}
