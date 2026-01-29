import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

type ImportResult = {
  imported: number;
  totalRows: number;
  errors: { row: number; message: string }[];
};

export function useMasterExportImport(endpoint: string, queryKey: string[]) {
  const queryClient = useQueryClient();

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get(`/${endpoint}/export`, {
        responseType: "blob",
      });
      return res;
    },
    onSuccess: (res) => {
      const disposition = res.headers?.["content-disposition"];
      const match = disposition?.match(/filename="?([^";\n]+)"?/);
      const filename =
        match?.[1] ?? `${endpoint}-export-${new Date().toISOString().split("T")[0]}.xlsx`;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export downloaded successfully");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Export failed.";
      toast.error(msg);
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`/${endpoint}/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data?.data as ImportResult;
    },
    onSuccess: (data: ImportResult) => {
      queryClient.invalidateQueries({ queryKey });
      const { imported, totalRows, errors } = data;
      if (errors?.length > 0) {
        const errList = errors.slice(0, 5).map((e) => `Row ${e.row}: ${e.message}`).join("\n");
        const more = errors.length > 5 ? `\n... and ${errors.length - 5} more` : "";
        toast.success(`Imported ${imported} of ${totalRows} records.`, {
          duration: 4000,
        });
        toast.error(`Some rows had errors:\n${errList}${more}`, {
          duration: 8000,
        });
      } else {
        toast.success(
          imported === totalRows
            ? `Successfully imported ${imported} record${imported === 1 ? "" : "s"}.`
            : `Imported ${imported} of ${totalRows} records.`
        );
      }
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Import failed.";
      toast.error(msg);
    },
  });

  return {
    handleExport: () => exportMutation.mutate(),
    handleImport: (file: File) => importMutation.mutate(file),
    exportLoading: exportMutation.isPending,
    importLoading: importMutation.isPending,
  };
}
