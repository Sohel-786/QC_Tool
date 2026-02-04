using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("reports")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IExcelService _excelService;

        public ReportsController(ApplicationDbContext context, IExcelService excelService)
        {
            _context = context;
            _excelService = excelService;
        }

        [HttpGet("issued-items")]
        public async Task<ActionResult<ApiResponse<object>>> GetIssuedItemsReport(
            [FromQuery] string? search = null,
            [FromQuery] string? companyIds = null,
            [FromQuery] string? contractorIds = null,
            [FromQuery] string? machineIds = null,
            [FromQuery] string? locationIds = null,
            [FromQuery] string? itemIds = null,
            [FromQuery] string? operatorName = null,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 25)
        {
            var query = _context.Issues.Where(i => !i.IsReturned).AsQueryable();

            if (!string.IsNullOrEmpty(search))
                query = query.Where(i => i.IssueNo.Contains(search) || (i.Item != null && i.Item.ItemName.Contains(search)) || (i.IssuedTo != null && i.IssuedTo.Contains(search)));
            
            if (!string.IsNullOrEmpty(companyIds))
            {
                var ids = companyIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => ids.Contains(i.CompanyId));
            }
            if (!string.IsNullOrEmpty(contractorIds))
            {
                var ids = contractorIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => ids.Contains(i.ContractorId));
            }
            if (!string.IsNullOrEmpty(machineIds))
            {
                var ids = machineIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => ids.Contains(i.MachineId));
            }
            if (!string.IsNullOrEmpty(locationIds))
            {
                var ids = locationIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => ids.Contains(i.LocationId));
            }
            if (!string.IsNullOrEmpty(itemIds))
            {
                var ids = itemIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => ids.Contains(i.ItemId));
            }
            if (!string.IsNullOrEmpty(operatorName))
                query = query.Where(i => i.IssuedTo != null && i.IssuedTo.Contains(operatorName));

            var total = await query.CountAsync();
            var issues = await query
                .Include(i => i.Item)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .Include(i => i.IssuedByUser)
                .OrderByDescending(i => i.IssuedAt)
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToListAsync();

            return Ok(new 
            {
                Success = true,
                Data = issues,
                Total = total,
                Page = page,
                Limit = limit
            });
        }

        [HttpGet("missing-items")]
        public async Task<ActionResult<ApiResponse<object>>> GetMissingItemsReport(
            [FromQuery] int page = 1, 
            [FromQuery] int limit = 25,
            [FromQuery] string? search = null)
        {
            var query = _context.Items.Where(i => i.Status == ItemStatus.MISSING).AsQueryable();

            if (!string.IsNullOrEmpty(search))
                query = query.Where(i => i.ItemName.Contains(search) || (i.SerialNumber != null && i.SerialNumber.Contains(search)));

            var total = await query.CountAsync();
            var items = await query
                .Include(i => i.Category)
                .Include(i => i.Issues).ThenInclude(issue => issue.Location)
                .OrderBy(i => i.ItemName)
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToListAsync();

            return Ok(new 
            {
                Success = true,
                Data = items,
                Total = total,
                Page = page,
                Limit = limit
            });
        }

        [HttpGet("item-history/{itemId}")]
        public async Task<ActionResult<ApiResponse<object>>> GetItemHistory(
            int itemId,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 25)
        {
            var item = await _context.Items
                .Include(i => i.Category)
                .FirstOrDefaultAsync(i => i.Id == itemId);
            
            if (item == null) return NotFound(new ApiResponse<object> { Success = false, Message = "Item not found" });

            var issuesQuery = _context.Issues
                .Where(i => i.ItemId == itemId)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .Include(i => i.IssuedByUser)
                .AsQueryable();

            var returnsQuery = _context.Returns
                .Where(r => r.ItemId == itemId)
                .Include(r => r.Company)
                .Include(r => r.Contractor)
                .Include(r => r.Machine)
                .Include(r => r.Location)
                .Include(r => r.Status)
                .Include(r => r.ReturnedByUser)
                .AsQueryable();

            var issueEvents = await issuesQuery.ToListAsync();
            var returnEvents = await returnsQuery.ToListAsync();

            var events = new List<object>();
            foreach (var issue in issueEvents)
            {
                events.Add(new
                {
                    Type = "issue",
                    Date = issue.IssuedAt,
                    No = issue.IssueNo,
                    User = $"{issue.IssuedByUser?.FirstName} {issue.IssuedByUser?.LastName}",
                    Company = issue.Company?.Name,
                    Contractor = issue.Contractor?.Name,
                    Machine = issue.Machine?.Name,
                    Location = issue.Location?.Name,
                    Remarks = issue.Remarks,
                    IssuedTo = issue.IssuedTo
                });
            }

            foreach (var ret in returnEvents)
            {
                events.Add(new
                {
                    Type = "return",
                    Date = ret.ReturnedAt,
                    No = ret.Issue != null ? ret.Issue.IssueNo : "N/A",
                    User = $"{ret.ReturnedByUser?.FirstName} {ret.ReturnedByUser?.LastName}",
                    Company = ret.Company?.Name,
                    Contractor = ret.Contractor?.Name,
                    Machine = ret.Machine?.Name,
                    Location = ret.Location?.Name,
                    Remarks = ret.Remarks,
                    Status = ret.Status?.Name
                });
            }

            var sortedEvents = events.OrderByDescending(e => ((dynamic)e).Date).ToList();
            var total = sortedEvents.Count;
            var data = sortedEvents.Skip((page - 1) * limit).Take(limit).ToList();

            return Ok(new 
            {
                Success = true,
                Data = data,
                Total = total,
                Page = page,
                Limit = limit,
                Item = item
            });
        }
        [HttpGet("export/issued-items")]
        public async Task<IActionResult> ExportIssuedItems(
            [FromQuery] string? search = null,
            [FromQuery] string? companyIds = null,
            [FromQuery] string? contractorIds = null,
            [FromQuery] string? machineIds = null,
            [FromQuery] string? locationIds = null)
        {
            var query = _context.Issues.Where(i => !i.IsReturned).AsQueryable();

            if (!string.IsNullOrEmpty(search))
                query = query.Where(i => i.IssueNo.Contains(search) || (i.Item != null && i.Item.ItemName.Contains(search)));
            if (!string.IsNullOrEmpty(companyIds))
                query = query.Where(i => companyIds.Split(',', StringSplitOptions.None).Select(int.Parse).Contains(i.CompanyId));
            if (!string.IsNullOrEmpty(contractorIds))
                query = query.Where(i => contractorIds.Split(',', StringSplitOptions.None).Select(int.Parse).Contains(i.ContractorId));
            if (!string.IsNullOrEmpty(machineIds))
                query = query.Where(i => machineIds.Split(',', StringSplitOptions.None).Select(int.Parse).Contains(i.MachineId));
            if (!string.IsNullOrEmpty(locationIds))
                query = query.Where(i => locationIds.Split(',', StringSplitOptions.None).Select(int.Parse).Contains(i.LocationId));

            var issues = await query
                .Include(i => i.Item)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .Include(i => i.IssuedByUser)
                .OrderByDescending(i => i.IssuedAt)
                .ToListAsync();

            var data = issues.Select(i => new {
                IssueNo = i.IssueNo,
                ItemName = i.Item?.ItemName,
                SerialNumber = i.Item?.SerialNumber,
                IssuedTo = i.IssuedTo,
                Company = i.Company?.Name,
                Contractor = i.Contractor?.Name,
                Machine = i.Machine?.Name,
                Location = i.Location?.Name,
                IssuedAt = i.IssuedAt.ToString("yyyy-MM-dd HH:mm"),
                IssuedBy = $"{i.IssuedByUser?.FirstName} {i.IssuedByUser?.LastName}"
            });

            var file = _excelService.GenerateExcel(data, "Issued Items");
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "issued_items.xlsx");
        }

        [HttpGet("export/missing-items")]
        public async Task<IActionResult> ExportMissingItems([FromQuery] string? search = null)
        {
            var query = _context.Items.Where(i => i.Status == ItemStatus.MISSING).AsQueryable();
            if (!string.IsNullOrEmpty(search))
                query = query.Where(i => i.ItemName.Contains(search) || (i.SerialNumber != null && i.SerialNumber.Contains(search)));

            var items = await query.Include(i => i.Category).OrderBy(i => i.ItemName).ToListAsync();
            var data = items.Select(i => new {
                ItemName = i.ItemName,
                SerialNumber = i.SerialNumber,
                Category = i.Category?.Name,
                Description = i.Description,
                CreatedAt = i.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });

            var file = _excelService.GenerateExcel(data, "Missing Items");
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "missing_items.xlsx");
        }

        [HttpGet("export/item-history")]
        public async Task<IActionResult> ExportItemHistory([FromQuery] int itemId)
        {
            var item = await _context.Items.Include(i => i.Category).FirstOrDefaultAsync(i => i.Id == itemId);
            if (item == null) return NotFound();

            var issues = await _context.Issues
                .Where(i => i.ItemId == itemId)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .Include(i => i.IssuedByUser)
                .Include(r => r.Returns).ThenInclude(r => r.ReturnedByUser)
                .OrderByDescending(i => i.IssuedAt)
                .ToListAsync();

            var exportData = new List<object>();
            foreach (var issue in issues)
            {
                exportData.Add(new {
                    Type = "Issue",
                    Date = issue.IssuedAt.ToString("yyyy-MM-dd HH:mm"),
                    IssueNo = issue.IssueNo,
                    Description = "Item Issued",
                    Company = issue.Company?.Name,
                    Contractor = issue.Contractor?.Name,
                    Machine = issue.Machine?.Name,
                    Location = issue.Location?.Name,
                    User = $"{issue.IssuedByUser?.FirstName} {issue.IssuedByUser?.LastName}",
                    Remarks = issue.Remarks
                });

                foreach (var ret in issue.Returns)
                {
                    exportData.Add(new {
                        Type = "Return",
                        Date = ret.ReturnedAt.ToString("yyyy-MM-dd HH:mm"),
                        IssueNo = issue.IssueNo,
                        Description = "Item Returned",
                        Company = issue.Company?.Name,
                        Contractor = issue.Contractor?.Name,
                        Machine = issue.Machine?.Name,
                        Location = issue.Location?.Name,
                        User = $"{ret.ReturnedByUser?.FirstName} {ret.ReturnedByUser?.LastName}",
                        Remarks = ret.Remarks
                    });
                }
            }

            var title = $"Ledger for: {item.ItemName} (S/N: {item.SerialNumber})";
            var file = _excelService.GenerateExcel(exportData, "Item History", title);
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"item_history_{item.SerialNumber}.xlsx");
        }
    }
}
