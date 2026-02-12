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
    public class ReportsController : DivisionIsolatedController
    {
        private readonly ApplicationDbContext _context;
        private readonly IExcelService _excelService;

        public ReportsController(ApplicationDbContext context, IExcelService excelService, IDivisionService divisionService)
            : base(divisionService)
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
            [FromQuery] string? dateFrom = null,
            [FromQuery] string? dateTo = null,
            [FromQuery] string? conditions = null,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 25)
        {
            var query = _context.Issues.Where(i => i.IsActive && !i.IsReturned && i.DivisionId == CurrentDivisionId).AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                var term = search.Trim();
                query = query.Where(i => i.IssueNo.Contains(term) || 
                                       (i.Item != null && (i.Item.ItemName.Contains(term) || i.Item.SerialNumber.Contains(term))) ||
                                       (i.IssuedTo != null && i.IssuedTo.Contains(term)) ||
                                       (i.Company != null && i.Company.Name.Contains(term)) ||
                                       (i.Contractor != null && i.Contractor.Name.Contains(term)) ||
                                       (i.Machine != null && i.Machine.Name.Contains(term)) ||
                                       (i.Location != null && i.Location.Name.Contains(term)));
            }
            
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

            if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out DateTime fromDate))
                query = query.Where(i => i.IssuedAt >= fromDate);
            
            if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out DateTime toDate))
                query = query.Where(i => i.IssuedAt <= toDate);

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
            [FromQuery] string? companyIds = null,
            [FromQuery] string? contractorIds = null,
            [FromQuery] string? machineIds = null,
            [FromQuery] string? locationIds = null,
            [FromQuery] string? itemIds = null,
            [FromQuery] string? operatorName = null,
            [FromQuery] string? search = null,
            [FromQuery] string? conditions = null,
            [FromQuery] int page = 1, 
            [FromQuery] int limit = 25)
        {
            var query = _context.Items.Where(i => i.IsActive && i.Status == ItemStatus.MISSING && i.DivisionId == CurrentDivisionId).AsQueryable();

            if (!string.IsNullOrEmpty(companyIds))
            {
                var ids = companyIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.Issues.Any(iss => ids.Contains(iss.CompanyId)));
            }
            if (!string.IsNullOrEmpty(contractorIds))
            {
                var ids = contractorIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.Issues.Any(iss => ids.Contains(iss.ContractorId)));
            }
            if (!string.IsNullOrEmpty(machineIds))
            {
                var ids = machineIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.Issues.Any(iss => ids.Contains(iss.MachineId)));
            }
            if (!string.IsNullOrEmpty(locationIds))
            {
                var ids = locationIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.Issues.Any(iss => ids.Contains(iss.LocationId)));
            }
            if (!string.IsNullOrEmpty(itemIds))
            {
                var ids = itemIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => ids.Contains(i.Id));
            }
            if (!string.IsNullOrEmpty(operatorName))
                query = query.Where(i => i.Issues.Any(iss => iss.IssuedTo != null && iss.IssuedTo.Contains(operatorName)));

            if (!string.IsNullOrEmpty(search))
            {
                var term = search.Trim();
                query = query.Where(i => i.ItemName.Contains(term) || 
                                       (i.SerialNumber != null && i.SerialNumber.Contains(term)) ||
                                       (i.Description != null && i.Description.Contains(term)) ||
                                       i.Issues.Any(iss => iss.IssueNo.Contains(term) || 
                                                          (iss.IssuedTo != null && iss.IssuedTo.Contains(term)) ||
                                                          (iss.Company != null && iss.Company.Name.Contains(term)) ||
                                                          (iss.Contractor != null && iss.Contractor.Name.Contains(term)) ||
                                                          (iss.Machine != null && iss.Machine.Name.Contains(term)) ||
                                                          (iss.Location != null && iss.Location.Name.Contains(term))));
            }

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
            [FromQuery] string? companyIds = null,
            [FromQuery] string? contractorIds = null,
            [FromQuery] string? machineIds = null,
            [FromQuery] string? locationIds = null,
            [FromQuery] string? operatorName = null,
            [FromQuery] string? search = null,
            [FromQuery] string? conditions = null,
            [FromQuery] string? dateFrom = null,
            [FromQuery] string? dateTo = null,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 25)
        {
            var item = await _context.Items
                .Include(i => i.Category)
                .FirstOrDefaultAsync(i => i.Id == itemId && i.DivisionId == CurrentDivisionId);
            
            if (item == null) 
                return NotFound(new ApiResponse<object> { Success = false, Message = "Item not found" });

            // 1. Prepare Filters
            var cIds = !string.IsNullOrEmpty(companyIds) ? companyIds.Split(',').Select(int.Parse).ToList() : null;
            var ctIds = !string.IsNullOrEmpty(contractorIds) ? contractorIds.Split(',').Select(int.Parse).ToList() : null;
            var mIds = !string.IsNullOrEmpty(machineIds) ? machineIds.Split(',').Select(int.Parse).ToList() : null;
            var lIds = !string.IsNullOrEmpty(locationIds) ? locationIds.Split(',').Select(int.Parse).ToList() : null;
            var condList = !string.IsNullOrEmpty(conditions) ? conditions.Split(',').Select(c => c.Trim().ToLower()).ToList() : null;

            // 2. Fetch Source Data
            var issuesQuery = _context.Issues
                .Where(i => i.ItemId == itemId && i.IsActive && i.DivisionId == CurrentDivisionId)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .Include(i => i.IssuedByUser)
                .Include(i => i.Returns.Where(r => r.IsActive)).ThenInclude(r => r.ReturnedByUser)
                .AsQueryable();

            var issues = await issuesQuery.ToListAsync();

            var standaloneReturnsQuery = _context.Returns
                .Where(r => r.ItemId == itemId && r.IssueId == null && r.IsActive && r.DivisionId == CurrentDivisionId)
                .Include(r => r.Company)
                .Include(r => r.Contractor)
                .Include(r => r.Machine)
                .Include(r => r.Location)
                .Include(r => r.ReturnedByUser)
                .AsQueryable();

            var standaloneReturns = await standaloneReturnsQuery.ToListAsync();

            // 3. Construct and Filter Rows
            var finalEvents = new List<dynamic>();

            // Process Issues and their related Returns
            foreach (var issue in issues) {
                bool issueMatches = true;
                if (cIds != null && !cIds.Contains(issue.CompanyId)) issueMatches = false;
                if (ctIds != null && !ctIds.Contains(issue.ContractorId)) issueMatches = false;
                if (mIds != null && !mIds.Contains(issue.MachineId)) issueMatches = false;
                if (lIds != null && !lIds.Contains(issue.LocationId)) issueMatches = false;
                if (!string.IsNullOrEmpty(operatorName) && (issue.IssuedTo == null || !issue.IssuedTo.Contains(operatorName))) issueMatches = false;
                
                if (issueMatches) {
                    bool conditionMatches = condList == null || condList.Contains("ok");
                    if (conditionMatches) {
                        finalEvents.Add(new {
                            type = "issue",
                            date = issue.IssuedAt,
                            issueNo = issue.IssueNo,
                            description = $"Issued to {issue.IssuedTo ?? "—"}",
                            user = $"{issue.IssuedByUser?.FirstName} {issue.IssuedByUser?.LastName}",
                            company = issue.Company?.Name,
                            contractor = issue.Contractor?.Name,
                            machine = issue.Machine?.Name,
                            location = issue.Location?.Name,
                            remarks = issue.Remarks,
                            condition = "OK",
                            inwardNo = (string?)null
                        });
                    }
                }

                foreach (var ret in issue.Returns) {
                    if (issueMatches) {
                        bool conditionMatches = condList == null || (ret.Condition != null && condList.Contains(ret.Condition.Trim().ToLower()));
                        if (conditionMatches) {
                            finalEvents.Add(new {
                                type = "return",
                                date = ret.ReturnedAt,
                                issueNo = issue.IssueNo,
                                description = string.IsNullOrEmpty(ret.Condition) ? "Returned" : $"Returned ({ret.Condition})",
                                user = $"{ret.ReturnedByUser?.FirstName} {ret.ReturnedByUser?.LastName}",
                                company = issue.Company?.Name,
                                contractor = issue.Contractor?.Name,
                                machine = issue.Machine?.Name,
                                location = issue.Location?.Name,
                                remarks = ret.Remarks,
                                condition = ret.Condition,
                                returnCode = ret.ReturnCode,
                                inwardNo = ret.ReturnCode
                            });
                        }
                    }
                }
            }

            // Process Standalone Returns
            foreach (var ret in standaloneReturns) {
                bool returnMatches = true;
                if (cIds != null && (ret.CompanyId == null || !cIds.Contains(ret.CompanyId.Value))) returnMatches = false;
                if (ctIds != null && (ret.ContractorId == null || !ctIds.Contains(ret.ContractorId.Value))) returnMatches = false;
                if (mIds != null && (ret.MachineId == null || !mIds.Contains(ret.MachineId.Value))) returnMatches = false;
                if (lIds != null && (ret.LocationId == null || !lIds.Contains(ret.LocationId.Value))) returnMatches = false;
                if (condList != null && (ret.Condition == null || !condList.Contains(ret.Condition.Trim().ToLower()))) returnMatches = false;

                if (returnMatches) {
                    finalEvents.Add(new {
                        type = "return",
                        date = ret.ReturnedAt,
                        issueNo = "—",
                        description = string.IsNullOrEmpty(ret.Condition) ? "Received (Missing item)" : $"Received (Missing item) ({ret.Condition})",
                        user = $"{ret.ReturnedByUser?.FirstName} {ret.ReturnedByUser?.LastName}",
                        company = ret.Company?.Name,
                        contractor = ret.Contractor?.Name,
                        machine = ret.Machine?.Name,
                        location = ret.Location?.Name,
                        remarks = ret.Remarks,
                        condition = ret.Condition,
                        returnCode = ret.ReturnCode,
                        inwardNo = ret.ReturnCode
                    });
                }
            }

            // 4. Apply Common Filters (Search and Date)
            var filteredEvents = finalEvents.AsEnumerable();

            if (!string.IsNullOrEmpty(search)) {
                var term = search.Trim().ToLower();
                filteredEvents = filteredEvents.Where(e => 
                    (e.issueNo != null && e.issueNo.ToLower().Contains(term)) ||
                    (e.description != null && e.description.ToLower().Contains(term)) ||
                    (e.user != null && e.user.ToLower().Contains(term)) ||
                    (e.company != null && e.company.ToLower().Contains(term)) ||
                    (e.contractor != null && e.contractor.ToLower().Contains(term)) ||
                    (e.machine != null && e.machine.ToLower().Contains(term)) ||
                    (e.location != null && e.location.ToLower().Contains(term)) ||
                    (e.remarks != null && e.remarks.ToLower().Contains(term)) ||
                    (e.condition != null && e.condition.ToLower().Contains(term)) ||
                    (e.inwardNo != null && e.inwardNo.ToLower().Contains(term))
                );
            }

            if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out DateTime dFrom))
                filteredEvents = filteredEvents.Where(e => e.date >= dFrom);
            
            if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out DateTime dTo))
                filteredEvents = filteredEvents.Where(e => e.date <= dTo);

            // 5. Sort, Count, and Page
            var sortedEvents = filteredEvents.OrderByDescending(e => e.date).ToList();
            var totalCount = sortedEvents.Count;
            var pagedData = sortedEvents.Skip((page - 1) * limit).Take(limit).ToList();

            return Ok(new 
            {
                success = true,
                data = new {
                    item = item,
                    rows = pagedData,
                    total = totalCount,
                    page = page,
                    limit = limit
                }
            });
        }
        [HttpGet("export/issued-items")]
        public async Task<IActionResult> ExportIssuedItems(
            [FromQuery] string? search = null,
            [FromQuery] string? companyIds = null,
            [FromQuery] string? contractorIds = null,
            [FromQuery] string? machineIds = null,
            [FromQuery] string? locationIds = null,
            [FromQuery] string? itemIds = null,
            [FromQuery] string? operatorName = null,
            [FromQuery] string? conditions = null,
            [FromQuery] string? dateFrom = null,
            [FromQuery] string? dateTo = null)
        {
            var query = _context.Issues.Where(i => i.IsActive && !i.IsReturned && i.DivisionId == CurrentDivisionId).AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                var term = search.Trim();
                query = query.Where(i => i.IssueNo.Contains(term) || 
                                       (i.Item != null && (i.Item.ItemName.Contains(term) || i.Item.SerialNumber.Contains(term))) ||
                                       (i.IssuedTo != null && i.IssuedTo.Contains(term)) ||
                                       (i.Company != null && i.Company.Name.Contains(term)) ||
                                       (i.Contractor != null && i.Contractor.Name.Contains(term)) ||
                                       (i.Machine != null && i.Machine.Name.Contains(term)) ||
                                       (i.Location != null && i.Location.Name.Contains(term)));
            }
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

            if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out DateTime fromDate))
                query = query.Where(i => i.IssuedAt >= fromDate);
            
            if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out DateTime toDate))
                query = query.Where(i => i.IssuedAt <= toDate);

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
        public async Task<IActionResult> ExportMissingItems(
            [FromQuery] string? companyIds = null,
            [FromQuery] string? contractorIds = null,
            [FromQuery] string? machineIds = null,
            [FromQuery] string? locationIds = null,
            [FromQuery] string? itemIds = null,
            [FromQuery] string? operatorName = null,
            [FromQuery] string? search = null,
            [FromQuery] string? conditions = null)
        {
            var query = _context.Items.Where(i => i.IsActive && i.Status == ItemStatus.MISSING && i.DivisionId == CurrentDivisionId).AsQueryable();

            if (!string.IsNullOrEmpty(companyIds))
            {
                var ids = companyIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.Issues.Any(iss => ids.Contains(iss.CompanyId)));
            }
            if (!string.IsNullOrEmpty(contractorIds))
            {
                var ids = contractorIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.Issues.Any(iss => ids.Contains(iss.ContractorId)));
            }
            if (!string.IsNullOrEmpty(machineIds))
            {
                var ids = machineIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.Issues.Any(iss => ids.Contains(iss.MachineId)));
            }
            if (!string.IsNullOrEmpty(locationIds))
            {
                var ids = locationIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => i.Issues.Any(iss => ids.Contains(iss.LocationId)));
            }
            if (!string.IsNullOrEmpty(itemIds))
            {
                var ids = itemIds.Split(',').Select(int.Parse).ToList();
                query = query.Where(i => ids.Contains(i.Id));
            }
            if (!string.IsNullOrEmpty(operatorName))
                query = query.Where(i => i.Issues.Any(iss => iss.IssuedTo != null && iss.IssuedTo.Contains(operatorName)));

            if (!string.IsNullOrEmpty(search))
            {
                var term = search.Trim();
                query = query.Where(i => i.ItemName.Contains(term) || 
                                       (i.SerialNumber != null && i.SerialNumber.Contains(term)) ||
                                       (i.Description != null && i.Description.Contains(term)) ||
                                       i.Issues.Any(iss => iss.IssueNo.Contains(term) || 
                                                          (iss.IssuedTo != null && iss.IssuedTo.Contains(term)) ||
                                                          (iss.Company != null && iss.Company.Name.Contains(term)) ||
                                                          (iss.Contractor != null && iss.Contractor.Name.Contains(term)) ||
                                                          (iss.Machine != null && iss.Machine.Name.Contains(term)) ||
                                                          (iss.Location != null && iss.Location.Name.Contains(term))));
            }

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
        public async Task<IActionResult> ExportItemHistory(
            [FromQuery] int itemId,
            [FromQuery] string? companyIds = null,
            [FromQuery] string? contractorIds = null,
            [FromQuery] string? machineIds = null,
            [FromQuery] string? locationIds = null,
            [FromQuery] string? operatorName = null,
            [FromQuery] string? search = null,
            [FromQuery] string? conditions = null,
            [FromQuery] string? dateFrom = null,
            [FromQuery] string? dateTo = null)
        {
            var item = await _context.Items.Include(i => i.Category).FirstOrDefaultAsync(i => i.Id == itemId && i.DivisionId == CurrentDivisionId);
            if (item == null) return NotFound();

            var issuesQuery = _context.Issues
                .Where(i => i.ItemId == itemId && i.IsActive && i.DivisionId == CurrentDivisionId)
                .Include(i => i.Company)
                .Include(i => i.Contractor)
                .Include(i => i.Machine)
                .Include(i => i.Location)
                .Include(i => i.IssuedByUser)
                .Include(i => i.Returns.Where(r => r.IsActive)).ThenInclude(r => r.ReturnedByUser)
                .AsQueryable();

            var issues = await issuesQuery.ToListAsync();

            var standaloneReturnsQuery = _context.Returns
                .Where(r => r.ItemId == itemId && r.IssueId == null && r.IsActive && r.DivisionId == CurrentDivisionId)
                .Include(r => r.Company)
                .Include(r => r.Contractor)
                .Include(r => r.Machine)
                .Include(r => r.Location)
                .Include(r => r.ReturnedByUser)
                .AsQueryable();

            var standaloneReturns = await standaloneReturnsQuery.ToListAsync();

            var cIds = !string.IsNullOrEmpty(companyIds) ? companyIds.Split(',').Select(int.Parse).ToList() : null;
            var ctIds = !string.IsNullOrEmpty(contractorIds) ? contractorIds.Split(',').Select(int.Parse).ToList() : null;
            var mIds = !string.IsNullOrEmpty(machineIds) ? machineIds.Split(',').Select(int.Parse).ToList() : null;
            var lIds = !string.IsNullOrEmpty(locationIds) ? locationIds.Split(',').Select(int.Parse).ToList() : null;
            var condList = !string.IsNullOrEmpty(conditions) ? conditions.Split(',').Select(c => c.Trim().ToLower()).ToList() : null;

            var exportRows = new List<dynamic>();

            foreach (var issue in issues) {
                bool issueMatches = true;
                if (cIds != null && !cIds.Contains(issue.CompanyId)) issueMatches = false;
                if (ctIds != null && !ctIds.Contains(issue.ContractorId)) issueMatches = false;
                if (mIds != null && !mIds.Contains(issue.MachineId)) issueMatches = false;
                if (lIds != null && !lIds.Contains(issue.LocationId)) issueMatches = false;
                if (!string.IsNullOrEmpty(operatorName) && (issue.IssuedTo == null || !issue.IssuedTo.Contains(operatorName))) issueMatches = false;
                
                if (issueMatches) {
                    bool conditionMatches = condList == null || condList.Contains("ok");
                    if (conditionMatches) {
                        exportRows.Add(new {
                            Date = issue.IssuedAt.ToString("yyyy-MM-dd HH:mm"),
                            Type = "Issue",
                            IssueNo = issue.IssueNo,
                            InwardNo = "—",
                            Company = issue.Company?.Name,
                            Contractor = issue.Contractor?.Name,
                            Machine = issue.Machine?.Name,
                            Location = issue.Location?.Name,
                            Description = $"Issued to {issue.IssuedTo ?? "—"}",
                            Condition = "OK",
                            By = $"{issue.IssuedByUser?.FirstName} {issue.IssuedByUser?.LastName}",
                            Remarks = issue.Remarks
                        });
                    }
                }

                foreach (var ret in issue.Returns) {
                    if (issueMatches) {
                        bool conditionMatches = condList == null || (ret.Condition != null && condList.Contains(ret.Condition.Trim().ToLower()));
                        if (conditionMatches) {
                            exportRows.Add(new {
                                Date = ret.ReturnedAt.ToString("yyyy-MM-dd HH:mm"),
                                Type = "Return",
                                IssueNo = issue.IssueNo,
                                InwardNo = ret.ReturnCode ?? "—",
                                Company = issue.Company?.Name,
                                Contractor = issue.Contractor?.Name,
                                Machine = issue.Machine?.Name,
                                Location = issue.Location?.Name,
                                Description = string.IsNullOrEmpty(ret.Condition) ? "Returned" : $"Returned ({ret.Condition})",
                                Condition = ret.Condition,
                                By = $"{ret.ReturnedByUser?.FirstName} {ret.ReturnedByUser?.LastName}",
                                Remarks = ret.Remarks
                            });
                        }
                    }
                }
            }

            foreach (var ret in standaloneReturns) {
                bool returnMatches = true;
                if (cIds != null && (ret.CompanyId == null || !cIds.Contains(ret.CompanyId.Value))) returnMatches = false;
                if (ctIds != null && (ret.ContractorId == null || !ctIds.Contains(ret.ContractorId.Value))) returnMatches = false;
                if (mIds != null && (ret.MachineId == null || !mIds.Contains(ret.MachineId.Value))) returnMatches = false;
                if (lIds != null && (ret.LocationId == null || !lIds.Contains(ret.LocationId.Value))) returnMatches = false;
                if (condList != null && (ret.Condition == null || !condList.Contains(ret.Condition.Trim().ToLower()))) returnMatches = false;

                if (returnMatches) {
                    exportRows.Add(new {
                        Date = ret.ReturnedAt.ToString("yyyy-MM-dd HH:mm"),
                        Type = "Return (Standalone)",
                        IssueNo = "—",
                        InwardNo = ret.ReturnCode ?? "—",
                        Company = ret.Company?.Name,
                        Contractor = ret.Contractor?.Name,
                        Machine = ret.Machine?.Name,
                        Location = ret.Location?.Name,
                        Description = string.IsNullOrEmpty(ret.Condition) ? "Received (Missing item)" : $"Received (Missing item) ({ret.Condition})",
                        Condition = ret.Condition,
                        By = $"{ret.ReturnedByUser?.FirstName} {ret.ReturnedByUser?.LastName}",
                        Remarks = ret.Remarks
                    });
                }
            }

            // Apply search filter
            if (!string.IsNullOrEmpty(search)) {
                var term = search.Trim().ToLower();
                exportRows = exportRows.Where(e => 
                    (e.IssueNo != null && e.IssueNo.ToLower().Contains(term)) ||
                    (e.InwardNo != null && e.InwardNo.ToLower().Contains(term)) ||
                    (e.Description != null && e.Description.ToLower().Contains(term)) ||
                    (e.By != null && e.By.ToLower().Contains(term)) ||
                    (e.Company != null && e.Company.ToLower().Contains(term)) ||
                    (e.Contractor != null && e.Contractor.ToLower().Contains(term)) ||
                    (e.Machine != null && e.Machine.ToLower().Contains(term)) ||
                    (e.Location != null && e.Location.ToLower().Contains(term)) ||
                    (e.Remarks != null && e.Remarks.ToLower().Contains(term))
                ).ToList();
            }

            // Apply date filters
            if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out DateTime dFrom))
                exportRows = exportRows.Where(e => DateTime.Parse(e.Date) >= dFrom).ToList();
            
            if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out DateTime dTo))
                exportRows = exportRows.Where(e => DateTime.Parse(e.Date) <= dTo).ToList();

            var sortedRows = exportRows.OrderByDescending(e => DateTime.Parse(e.Date)).ToList();

            var title = $"Ledger for: {item.ItemName} (S/N: {item.SerialNumber})";
            var file = _excelService.GenerateExcel(sortedRows, "Item History", title);
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"item_history_{item.Id}.xlsx");
        }
    }
}
