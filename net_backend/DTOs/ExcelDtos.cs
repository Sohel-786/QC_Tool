namespace net_backend.DTOs
{
    public class CompanyImportDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class ContractorImportDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class LocationImportDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class MachineImportDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class StatusImportDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class CategoryImportDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class ItemImportDto
    {
        public string ItemName { get; set; } = string.Empty;
        public string? SerialNumber { get; set; }
        public string? Description { get; set; }
        public string? Category { get; set; }
    }

    public class RowError
    {
        public int Row { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class ExcelRow<T> where T : new()
    {
        public int RowNumber { get; set; }
        public T Data { get; set; } = new T();
    }

    public class ImportResultDto<T> where T : new()
    {
        public int Imported { get; set; }
        public int TotalRows { get; set; }
        public List<RowError> Errors { get; set; } = new List<RowError>();
        public List<ExcelRow<T>> Data { get; set; } = new List<ExcelRow<T>>();
    }
}
