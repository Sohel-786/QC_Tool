using Microsoft.AspNetCore.Http;

namespace net_backend.DTOs
{
    public class CreateIssueRequest
    {
        public int ItemId { get; set; }
        public string? IssuedTo { get; set; }
        public string? Remarks { get; set; }
        public int CompanyId { get; set; }
        public int ContractorId { get; set; }
        public int MachineId { get; set; }
        public int LocationId { get; set; }
        public int? CategoryId { get; set; }
        public IFormFile? Image { get; set; }
    }

    public class UpdateIssueRequest
    {
        public int? ItemId { get; set; }
        public int? CategoryId { get; set; }
        public string? IssuedTo { get; set; }
        public string? Remarks { get; set; }
        public int? CompanyId { get; set; }
        public int? ContractorId { get; set; }
        public int? MachineId { get; set; }
        public int? LocationId { get; set; }
        public IFormFile? Image { get; set; }
    }
}
