using ClosedXML.Excel;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Reflection;
using net_backend.DTOs;

namespace net_backend.Services
{
    public class ExcelService : IExcelService
    {
        public byte[] GenerateExcel(IEnumerable<object> data, string sheetName = "Sheet1", string? titleRow = null)
        {
            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add(sheetName);
                var rowIdx = 1;

                if (!string.IsNullOrEmpty(titleRow))
                {
                    worksheet.Cell(rowIdx, 1).Value = titleRow;
                    worksheet.Cell(rowIdx, 1).Style.Font.Bold = true;
                    worksheet.Cell(rowIdx, 1).Style.Font.FontSize = 14;
                    rowIdx++;
                }

                if (data == null || !data.Any())
                {
                    using (var stream = new MemoryStream())
                    {
                        workbook.SaveAs(stream);
                        return stream.ToArray();
                    }
                }

                // Get properties for headers
                var firstItem = data.First();
                var properties = firstItem.GetType().GetProperties()
                    .Where(p => p.PropertyType.IsPrimitive || p.PropertyType == typeof(string) || p.PropertyType == typeof(decimal) || p.PropertyType == typeof(double) || p.PropertyType == typeof(DateTime) || p.PropertyType == typeof(int) || p.PropertyType == typeof(int?) || p.PropertyType == typeof(bool) || p.PropertyType.IsEnum)
                    .ToList();

                // Write Headers
                for (int i = 0; i < properties.Count; i++)
                {
                    var cell = worksheet.Cell(rowIdx, i + 1);
                    cell.Value = SplitCamelCase(properties[i].Name);
                    cell.Style.Font.Bold = true;
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#F3F4F6"); // Light gray background
                    cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                }
                
                var headerRow = rowIdx;
                rowIdx++;

                // Write Data
                foreach (var item in data)
                {
                    for (int i = 0; i < properties.Count; i++)
                    {
                        var value = properties[i].GetValue(item);
                        worksheet.Cell(rowIdx, i + 1).Value = value != null ? XLCellValue.FromObject(value) : "";
                    }
                    rowIdx++;
                }

                // Formatting
                worksheet.Columns().AdjustToContents();
                
                // Add filter to headers if data exists
                if (data.Any())
                {
                    worksheet.Range(headerRow, 1, rowIdx - 1, properties.Count).SetAutoFilter();
                }

                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    return stream.ToArray();
                }
            }
        }

        public ImportResultDto<T> ImportExcel<T>(Stream fileStream) where T : new()
        {
            var result = new ImportResultDto<T>();
            using (var workbook = new XLWorkbook(fileStream))
            {
                var worksheet = workbook.Worksheets.FirstOrDefault();
                if (worksheet == null) return result;

                var properties = typeof(T).GetProperties().ToList();
                var firstRow = worksheet.Row(1);
                
                // Map column index to property
                var columnMap = new Dictionary<int, PropertyInfo>();
                foreach (var cell in firstRow.CellsUsed())
                {
                    var header = cell.Value.ToString().Replace(" ", "").ToLower();
                    
                    // Match DTO properties with common Excel header aliases
                    var prop = properties.FirstOrDefault(p => {
                        var propName = p.Name.ToLower();
                        return propName == header || 
                               (propName == "companyname" && header == "company") ||
                               (propName == "name" && (header == "location" || header == "locationname")) ||
                               (propName == "itemname" && header == "item") ||
                               (propName == "isactive" && (header == "status" || header == "active"));
                    });
                    
                    if (prop != null)
                    {
                        columnMap.Add(cell.Address.ColumnNumber, prop);
                    }
                }

                var rows = worksheet.RowsUsed().Skip(1).ToList();
                result.TotalRows = rows.Count;

                foreach (var row in rows)
                {
                    var dto = new T();
                    var hasData = false;
                    try
                    {
                        foreach (var entry in columnMap)
                        {
                            var cell = row.Cell(entry.Key);
                            var prop = entry.Value;
                            if (!cell.IsEmpty())
                            {
                                hasData = true;
                                var cellValue = cell.Value.ToString();
                                var targetType = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;
                                
                                object? value;
                                if (targetType == typeof(bool))
                                {
                                    value = cellValue.ToLower() == "yes" || cellValue.ToLower() == "true" || cellValue == "1";
                                }
                                else
                                {
                                    value = Convert.ChangeType(cellValue, targetType);
                                }
                                prop.SetValue(dto, value);
                            }
                        }

                        if (hasData)
                        {
                            result.Data.Add(new ExcelRow<T> { RowNumber = row.RowNumber(), Data = dto });
                        }
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add(new RowError { Row = row.RowNumber(), Message = ex.Message });
                    }
                }
            }
            return result;
        }

        private string SplitCamelCase(string input)
        {
            if (string.IsNullOrEmpty(input)) return input;
            return System.Text.RegularExpressions.Regex.Replace(input, "([A-Z])", " $1", System.Text.RegularExpressions.RegexOptions.Compiled).Trim();
        }
    }
}
