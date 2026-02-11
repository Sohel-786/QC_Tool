namespace net_backend.DTOs
{
    public class CreateItemRequest
    {
        public string ItemName { get; set; } = string.Empty;
        public string SerialNumber { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? CategoryId { get; set; }
        public string? InHouseLocation { get; set; }
        public bool? IsActive { get; set; }
    }

    public class UpdateItemRequest : CreateItemRequest
    {
        public string? Status { get; set; }
    }
}
