namespace net_backend.DTOs
{
    public class CreateReturnRequest
    {
        public int? IssueId { get; set; }
        public int? ItemId { get; set; }
        public string Condition { get; set; } = string.Empty;
        public string? Remarks { get; set; }
        public string? ReceivedBy { get; set; }
        public int? StatusId { get; set; }
        public int? CompanyId { get; set; }
        public int? ContractorId { get; set; }
        public int? MachineId { get; set; }
        public int? LocationId { get; set; }
    }

    public class UpdateReturnRequest
    {
        public string? Remarks { get; set; }
        public string? ReceivedBy { get; set; }
        public int? StatusId { get; set; }
        public string? Condition { get; set; }
        public int? CompanyId { get; set; }
        public int? ContractorId { get; set; }
        public int? MachineId { get; set; }
        public int? LocationId { get; set; }
    }
}
