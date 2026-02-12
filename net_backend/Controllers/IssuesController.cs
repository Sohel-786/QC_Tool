using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;
using net_backend.Utils;

namespace net_backend.Controllers
{
    [Route("issues")]
    [ApiController]
    public class IssuesController : DivisionIsolatedController
    {
        private readonly ApplicationDbContext _context;
        private readonly ICodeGeneratorService _codeGenerator;

        public IssuesController(ApplicationDbContext context, ICodeGeneratorService codeGenerator, IDivisionService divisionService)
            : base(divisionService)
        {
            _context = context;
            _codeGenerator = codeGenerator;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Issue>>>> GetAll(
            [FromQuery] string? status,
            [FromQuery] string? companyIds,
            [FromQuery] string? contractorIds,
            [FromQuery] string? machineIds,
            [FromQuery] string? locationIds,
            [FromQuery] string? itemIds,
            [FromQuery] string? operatorName,
            [FromQuery] string? search,
            [FromQuery] bool? onlyPendingInward)
        {
            var query = _context.Issues
                .Where(i => i.DivisionId == CurrentDivisionId)
                .Include(i => i.Item)
                .Include(i => i.IssuedByUser)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .Include(i => i.Returns)
                .AsQueryable();

            // Status filter
            if (!string.IsNullOrEmpty(status))
            {
                if (status == "active") query = query.Where(i => i.IsActive);
                else if (status == "inactive") query = query.Where(i => !i.IsActive);
            }

            // Multi-select filters
            if (!string.IsNullOrEmpty(companyIds))
            {
                var ids = companyIds.Split(',').Select(id => int.TryParse(id.Trim(), out var n) ? n : 0).Where(n => n > 0).ToList();
                if (ids.Any()) query = query.Where(i => ids.Contains(i.CompanyId));
            }

            if (!string.IsNullOrEmpty(contractorIds))
            {
                var ids = contractorIds.Split(',').Select(id => int.TryParse(id.Trim(), out var n) ? n : 0).Where(n => n > 0).ToList();
                if (ids.Any()) query = query.Where(i => ids.Contains(i.ContractorId));
            }

            if (!string.IsNullOrEmpty(machineIds))
            {
                var ids = machineIds.Split(',').Select(id => int.TryParse(id.Trim(), out var n) ? n : 0).Where(n => n > 0).ToList();
                if (ids.Any()) query = query.Where(i => ids.Contains(i.MachineId));
            }

            if (!string.IsNullOrEmpty(locationIds))
            {
                var ids = locationIds.Split(',').Select(id => int.TryParse(id.Trim(), out var n) ? n : 0).Where(n => n > 0).ToList();
                if (ids.Any()) query = query.Where(i => ids.Contains(i.LocationId));
            }

            if (!string.IsNullOrEmpty(itemIds))
            {
                var ids = itemIds.Split(',').Select(id => int.TryParse(id.Trim(), out var n) ? n : 0).Where(n => n > 0).ToList();
                if (ids.Any()) query = query.Where(i => ids.Contains(i.ItemId));
            }

            // Operator name filter
            if (!string.IsNullOrEmpty(operatorName))
            {
                var searchTerm = operatorName.Trim();
                query = query.Where(i => i.IssuedTo != null && i.IssuedTo.Contains(searchTerm));
            }

            // Global search filter
            if (!string.IsNullOrEmpty(search))
            {
                var searchTerm = search.Trim();
                query = query.Where(i =>
                    i.IssueNo.Contains(searchTerm) ||
                    (i.Item != null && (i.Item.ItemName.Contains(searchTerm) || (i.Item.SerialNumber != null && i.Item.SerialNumber.Contains(searchTerm)))) ||
                    (i.Company != null && i.Company.Name.Contains(searchTerm)) ||
                    (i.Contractor != null && i.Contractor.Name.Contains(searchTerm)) ||
                    (i.Machine != null && i.Machine.Name.Contains(searchTerm)) ||
                    (i.Location != null && i.Location.Name.Contains(searchTerm)) ||
                    (i.IssuedTo != null && i.IssuedTo.Contains(searchTerm))
                );
            }

            // Only pending inward filter
            if (onlyPendingInward.HasValue && onlyPendingInward.Value)
            {
                query = query.Where(i => i.IsActive && !i.Returns.Any(r => r.IsActive));
            }

            var issues = await query.OrderByDescending(i => i.IssuedAt).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Issue>> { Data = issues });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Issue>>>> GetActive()
        {
            var issues = await _context.Issues
                .Where(i => i.DivisionId == CurrentDivisionId && i.IsActive && !i.Returns.Any(r => r.IsActive))
                .Include(i => i.Item)
                .Include(i => i.IssuedByUser)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Issue>> { Data = issues });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Issue>>> GetById(int id)
        {
            var issue = await _context.Issues
                .Include(i => i.Item)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .Include(i => i.IssuedByUser)
                .FirstOrDefaultAsync(i => i.Id == id && i.DivisionId == CurrentDivisionId);
                
            if (issue == null) return NotFound(new ApiResponse<Issue> { Success = false, Message = "Issue not found" });
            return Ok(new ApiResponse<Issue> { Data = issue });
        }

        [HttpGet("issue-no/{issueNo}")]
        public async Task<ActionResult<ApiResponse<Issue>>> GetByIssueNo(string issueNo)
        {
            var issue = await _context.Issues
                .Include(i => i.Item)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .FirstOrDefaultAsync(i => i.IssueNo == issueNo && i.DivisionId == CurrentDivisionId);
                
            if (issue == null) return NotFound(new ApiResponse<Issue> { Success = false, Message = "Issue not found" });
            return Ok(new ApiResponse<Issue> { Data = issue });
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<object>>> GetNextCode()
        {
            var count = await _context.Issues.CountAsync(i => i.DivisionId == CurrentDivisionId);
            var nextCode = _codeGenerator.GenerateNextCode("OUTWARD", count, CurrentDivisionName);
            return Ok(new ApiResponse<object> { Data = new { nextCode } });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Issue>>> Create([FromForm] CreateIssueRequest request)
        {
            if (!await CheckPermission("addOutward")) return Forbidden();
            
            if (string.IsNullOrWhiteSpace(request.IssuedTo))
            {
                return BadRequest(new ApiResponse<Issue> { Success = false, Message = "Operator name is required" });
            }

            if (request.Image == null || request.Image.Length == 0)
            {
                return BadRequest(new ApiResponse<Issue> { Success = false, Message = "Outward photo is mandatory." });
            }

            var item = await _context.Items
                .FirstOrDefaultAsync(i => i.Id == request.ItemId && i.DivisionId == CurrentDivisionId);
            if (item == null) return NotFound(new ApiResponse<Issue> { Success = false, Message = "Item not found" });
            if (item.Status != ItemStatus.AVAILABLE) return BadRequest(new ApiResponse<Issue> { Success = false, Message = "Item is not available" });

            var hasReturnImage = await _context.Returns.AnyAsync(r => r.ItemId == item.Id && r.DivisionId == CurrentDivisionId && r.IsActive && !string.IsNullOrEmpty(r.ReturnImage));
            if (string.IsNullOrEmpty(item.Image) && !hasReturnImage)
            {
                 return BadRequest(new ApiResponse<Issue> { Success = false, Message = "This item does not have an image. Items without images cannot be issued." });
            }

            // Save Outward Image
            string? issueImagePath = null;
            if (request.Image != null)
            {
                var serialNumber = item.SerialNumber ?? "unknown";
                var safeSerial = PathUtils.SanitizeSerialForPath(serialNumber);
                
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), PathUtils.GetOutwardFolderPath(CurrentDivisionName, serialNumber));
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                var uniqueFileName = $"{Guid.NewGuid()}_{request.Image.FileName}";
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await request.Image.CopyToAsync(fileStream);
                }
                issueImagePath = PathUtils.GetOutwardRelativePath(CurrentDivisionName, serialNumber, uniqueFileName);
            }

            var count = await _context.Issues.CountAsync(i => i.DivisionId == CurrentDivisionId);
            var issueNo = _codeGenerator.GenerateNextCode("OUTWARD", count, CurrentDivisionName);

            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var currentUserId = int.TryParse(userIdStr, out var uId) ? uId : 1;

            var issue = new Issue
            {
                IssueNo = issueNo,
                ItemId = request.ItemId,
                DivisionId = CurrentDivisionId,
                IssuedBy = currentUserId,
                IssuedTo = request.IssuedTo,
                Remarks = request.Remarks,
                CompanyId = request.CompanyId,
                ContractorId = request.ContractorId,
                MachineId = request.MachineId,
                LocationId = request.LocationId,
                IssueImage = issueImagePath,
                IsActive = true,
                IsReturned = false,
                IssuedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.Issues.Add(issue);
            item.Status = ItemStatus.ISSUED;
            
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<Issue> { Data = issue });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Issue>>> Update(int id, [FromForm] UpdateIssueRequest request)
        {
            if (!await CheckPermission("editOutward")) return Forbidden();

            var issue = await _context.Issues
                .Include(i => i.Item)
                .FirstOrDefaultAsync(i => i.Id == id && i.DivisionId == CurrentDivisionId);
            if (issue == null) return NotFound();
            if (issue.IsReturned) return BadRequest(new ApiResponse<Issue> { Success = false, Message = "Cannot edit returned issue" });

            // Handle Item Change
            if (request.ItemId.HasValue && request.ItemId.Value != issue.ItemId)
            {
                var newItem = await _context.Items
                    .FirstOrDefaultAsync(i => i.Id == request.ItemId.Value && i.DivisionId == CurrentDivisionId);
                if (newItem == null) return NotFound(new ApiResponse<Issue> { Success = false, Message = "New item not found" });
                if (newItem.Status != ItemStatus.AVAILABLE) return BadRequest(new ApiResponse<Issue> { Success = false, Message = "New item is not available" });

                var hasReturnImage = await _context.Returns.AnyAsync(r => r.ItemId == newItem.Id && r.DivisionId == CurrentDivisionId && r.IsActive && !string.IsNullOrEmpty(r.ReturnImage));
                if (string.IsNullOrEmpty(newItem.Image) && !hasReturnImage)
                {
                    return BadRequest(new ApiResponse<Issue> { Success = false, Message = "The selected item does not have an image. Items without images cannot be issued." });
                }

                var oldItem = issue.Item;
                if (oldItem != null)
                {
                    oldItem.Status = ItemStatus.AVAILABLE;
                }

                issue.ItemId = request.ItemId.Value;
                newItem.Status = ItemStatus.ISSUED;
            }

            // Handle Image Update
            if (request.Image != null && request.Image.Length > 0)
            {
                var item = await _context.Items.FindAsync(issue.ItemId);
                var serialNumber = item?.SerialNumber ?? "unknown";
                var safeSerial = PathUtils.SanitizeSerialForPath(serialNumber);

                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), PathUtils.GetOutwardFolderPath(CurrentDivisionName, serialNumber));
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                // Optionally delete old image if it exists
                if (!string.IsNullOrEmpty(issue.IssueImage))
                {
                    var oldPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "storage", issue.IssueImage);
                    if (System.IO.File.Exists(oldPath)) System.IO.File.Delete(oldPath);
                }

                var uniqueFileName = $"{Guid.NewGuid()}_{request.Image.FileName}";
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await request.Image.CopyToAsync(fileStream);
                }
                issue.IssueImage = PathUtils.GetOutwardRelativePath(CurrentDivisionName, serialNumber, uniqueFileName);
            }

            if (request.IssuedTo != null)
            {
                if (string.IsNullOrWhiteSpace(request.IssuedTo))
                {
                    return BadRequest(new ApiResponse<Issue> { Success = false, Message = "Operator name is required" });
                }
                issue.IssuedTo = request.IssuedTo;
            }
            if (request.Remarks != null) issue.Remarks = request.Remarks;
            if (request.CompanyId.HasValue) issue.CompanyId = request.CompanyId.Value;
            if (request.ContractorId.HasValue) issue.ContractorId = request.ContractorId.Value;
            if (request.MachineId.HasValue) issue.MachineId = request.MachineId.Value;
            if (request.LocationId.HasValue) issue.LocationId = request.LocationId.Value;

            issue.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<Issue> { Data = issue });
        }

        [HttpPatch("{id}/inactive")]
        public async Task<ActionResult<ApiResponse<Issue>>> SetInactive(int id)
        {
            if (User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value != "QC_ADMIN") return Forbidden();

            var issue = await _context.Issues
                .Include(i => i.Item)
                .FirstOrDefaultAsync(i => i.Id == id && i.DivisionId == CurrentDivisionId);
            if (issue == null) return NotFound(new ApiResponse<Issue> { Success = false, Message = "Issue not found" });
            
            if (issue.IsReturned)
            {
                return BadRequest(new ApiResponse<Issue> { Success = false, Message = "Cannot mark outward inactive once inward is done." });
            }

            issue.IsActive = false;
            issue.UpdatedAt = DateTime.Now;

            if (issue.Item != null)
            {
                issue.Item.Status = ItemStatus.AVAILABLE;
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Issue> { Data = issue });
        }

        [HttpPatch("{id}/active")]
        public async Task<ActionResult<ApiResponse<Issue>>> SetActive(int id)
        {
            if (User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value != "QC_ADMIN") return Forbidden();

            var issue = await _context.Issues
                .Include(i => i.Item)
                .FirstOrDefaultAsync(i => i.Id == id && i.DivisionId == CurrentDivisionId);
            if (issue == null) return NotFound(new ApiResponse<Issue> { Success = false, Message = "Issue not found" });

            issue.IsActive = true;
            issue.UpdatedAt = DateTime.Now;

            if (issue.Item != null && issue.Item.Status == ItemStatus.AVAILABLE)
            {
                issue.Item.Status = ItemStatus.ISSUED;
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Issue> { Data = issue });
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
                "addOutward" => permissions.AddOutward,
                "editOutward" => permissions.EditOutward,
                _ => false
            };
        }

        private ActionResult Forbidden()
        {
            return StatusCode(403, new ApiResponse<object> { Success = false, Message = "You do not have permission to perform this action." });
        }
    }
}
