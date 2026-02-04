namespace net_backend.Services
{
    public interface ICodeGeneratorService
    {
        string GenerateNextCode(string type, int count);
    }

    public class CodeGeneratorService : ICodeGeneratorService
    {
        public string GenerateNextCode(string type, int count)
        {
            string prefix = type == "OUTWARD" ? "OUT" : "INW";
            return $"{prefix}-{DateTime.Now:yyyyMMdd}-{count + 1:D4}";
        }
    }
}
