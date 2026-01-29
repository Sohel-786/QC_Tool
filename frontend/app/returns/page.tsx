"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Return, Issue, Role } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Upload, X } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const returnSchema = z.object({
  issueId: z.number().min(1, "Issue is required"),
  remarks: z.string().optional(),
});

type ReturnForm = z.infer<typeof returnSchema>;

export default function ReturnsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [nextInwardCode, setNextInwardCode] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const prefillIssueId = searchParams.get("issueId");
  const { user: currentUser } = useCurrentUser();
  const isManager = currentUser?.role === Role.QC_MANAGER;

  const { data: returns = [] } = useQuery<Return[]>({
    queryKey: ["returns"],
    queryFn: async () => {
      const res = await api.get("/returns");
      return res.data?.data ?? [];
    },
  });

  const { data: activeIssues = [] } = useQuery<Issue[]>({
    queryKey: ["active-issues"],
    queryFn: async () => {
      const res = await api.get("/issues/active");
      return res.data?.data ?? [];
    },
  });

  const { data: prefetchedIssue } = useQuery<Issue | null>({
    queryKey: ["issue", prefillIssueId],
    queryFn: async () => {
      if (!prefillIssueId) return null;
      const res = await api.get(`/issues/${prefillIssueId}`);
      return res.data?.data ?? null;
    },
    enabled: !!prefillIssueId && !!isFormOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReturnForm>({
    resolver: zodResolver(returnSchema),
  });

  const selectedIssueId = watch("issueId");

  const createMutation = useMutation({
    mutationFn: async (data: { formData: FormData }) => {
      const res = await api.post("/returns", data.formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["active-issues"] });
      handleCloseForm();
      toast.success("Inward entry created");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create inward entry.";
      toast.error(msg);
    },
  });

  const handleOpenForm = async (presetIssueId?: number) => {
    reset();
    setImageFile(null);
    setImagePreview(null);
    setIsDragOver(false);
    try {
      const res = await api.get("/returns/next-code");
      setNextInwardCode(res.data?.data?.nextCode ?? "");
    } catch {
      setNextInwardCode("");
    }
    if (presetIssueId) setValue("issueId", presetIssueId);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    reset();
    setNextInwardCode("");
    setImageFile(null);
    setImagePreview(null);
    createMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (typeof window !== "undefined" && prefillIssueId) {
      const u = new URL(window.location.href);
      u.searchParams.delete("issueId");
      window.history.replaceState({}, "", u.toString());
    }
  };

  useEffect(() => {
    if (!prefillIssueId || isManager) return;
    const id = parseInt(prefillIssueId, 10);
    if (Number.isNaN(id)) return;
    (async () => {
      reset();
      setImageFile(null);
      setImagePreview(null);
      try {
        const res = await api.get("/returns/next-code");
        setNextInwardCode(res.data?.data?.nextCode ?? "");
      } catch {
        setNextInwardCode("");
      }
      setValue("issueId", id);
      setIsFormOpen(true);
    })();
  }, [prefillIssueId, isManager]);

  const applyImage = (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    setImageFile(f);
    const r = new FileReader();
    r.onloadend = () => setImagePreview(r.result as string);
    r.readAsDataURL(f);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) applyImage(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) applyImage(f);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (data: ReturnForm) => {
    if (!imageFile) {
      toast.error("Return image is required.");
      return;
    }
    const formData = new FormData();
    formData.append("issueId", String(data.issueId));
    formData.append("image", imageFile);
    if (data.remarks) formData.append("remarks", data.remarks);
    createMutation.mutate({ formData });
  };

  const displayIssue = prefetchedIssue ?? activeIssues.find((i) => i.id === selectedIssueId);

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text mb-2">Inward</h1>
              <p className="text-secondary-600">
                {isManager ? "View inward entries" : "Record returns (inward)"}
              </p>
            </div>
            {!isManager && (
              <Button onClick={() => handleOpenForm()} className="shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Inward Entry
              </Button>
            )}
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Inward Entries ({returns.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {returns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {returns.map((r, idx) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-5 border border-secondary-200 rounded-lg hover:shadow-md transition-all bg-white"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-text mb-2">
                          {r.issue?.item?.itemName}
                        </h3>
                        {r.returnCode && (
                          <p className="text-sm text-secondary-600 mb-1">
                            <span className="font-medium">Inward No:</span>{" "}
                            {r.returnCode}
                          </p>
                        )}
                        <p className="text-sm text-secondary-600 mb-1">
                          <span className="font-medium">Issue No:</span>{" "}
                          {r.issue?.issueNo}
                        </p>
                        {r.remarks && (
                          <p className="text-sm text-secondary-500 mt-2 line-clamp-2">
                            {r.remarks}
                          </p>
                        )}
                        <p className="text-xs text-secondary-500 mt-2">
                          {formatDateTime(r.returnedAt)}
                        </p>
                      </div>
                      {r.returnImage && (
                        <div className="mt-3">
                          <img
                            src={`${API_BASE}/storage/${r.returnImage}`}
                            alt="Return"
                            className="w-full h-32 object-cover rounded border border-secondary-200"
                          />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-secondary-500 text-lg">
                    No inward entries yet. Create one above or from Outward.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title="Inward Entry"
          size="2xl"
          contentScroll={false}
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0 -m-6"
            aria-label="Inward entry form"
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
                <div className="space-y-5">
                  {nextInwardCode && (
                    <div>
                      <Label
                        htmlFor="inward-code"
                        className="text-sm font-medium text-secondary-700"
                      >
                        Inward No
                      </Label>
                      <Input
                        id="inward-code"
                        value={nextInwardCode}
                        disabled
                        readOnly
                        className="mt-1.5 h-10 bg-secondary-50 border-secondary-200"
                      />
                    </div>
                  )}

                  <div>
                    <Label
                      htmlFor="inward-issue-id"
                      className="text-sm font-medium text-secondary-700"
                    >
                      Outward (Issue) <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="inward-issue-id"
                      {...register("issueId", { valueAsNumber: true })}
                      className="mt-1.5 flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                      aria-required="true"
                    >
                      <option value="">Select outward entry</option>
                      {activeIssues.map((issue) => (
                        <option key={issue.id} value={issue.id}>
                          {issue.issueNo} — {issue.item?.itemName}
                          {issue.issuedTo ? ` (${issue.issuedTo})` : ""}
                        </option>
                      ))}
                    </select>
                    {errors.issueId && (
                      <p className="text-sm text-red-600 mt-1" role="alert">
                        {errors.issueId.message}
                      </p>
                    )}
                  </div>

                  {displayIssue && (
                    <div className="rounded-lg border border-secondary-200 bg-secondary-50/50 p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-text">
                        Outward details
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-secondary-700">
                        <span>Item</span>
                        <span>{displayIssue.item?.itemName ?? "—"}</span>
                        <span>Company</span>
                        <span>{displayIssue.company?.name ?? "—"}</span>
                        <span>Contractor</span>
                        <span>{displayIssue.contractor?.name ?? "—"}</span>
                        <span>Machine</span>
                        <span>{displayIssue.machine?.name ?? "—"}</span>
                        <span>Operator</span>
                        <span>{displayIssue.issuedTo ?? "—"}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label
                      htmlFor="inward-remarks"
                      className="text-sm font-medium text-secondary-700"
                    >
                      Remarks{" "}
                      <span className="text-secondary-400 font-normal">
                        (optional)
                      </span>
                    </Label>
                    <Textarea
                      id="inward-remarks"
                      {...register("remarks")}
                      placeholder="Optional remarks..."
                      rows={3}
                      className="mt-1.5 border-secondary-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 resize-y"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-secondary-700">
                      Return Image <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-xs text-secondary-500 mt-0.5">
                      JPG, PNG or WebP · Max 5MB
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={onFileChange}
                    className="hidden"
                    tabIndex={-1}
                  />
                  {imagePreview ? (
                    <div className="space-y-2">
                      <div className="relative rounded-lg overflow-hidden border border-secondary-200 bg-white aspect-video max-h-48">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Replace
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removeImage}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          fileInputRef.current?.click();
                      }}
                      onDrop={onDrop}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                      }}
                      className={`min-h-[160px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                        isDragOver
                          ? "border-primary-400 bg-primary-50/50"
                          : "border-secondary-300 bg-white hover:border-primary-300 hover:bg-primary-50/30"
                      }`}
                      aria-label="Upload return image"
                    >
                      <Upload className="w-10 h-10 text-secondary-400" />
                      <span className="text-sm font-medium text-secondary-600">
                        Drag & drop or click to upload
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-none flex gap-3 px-6 py-4 border-t border-secondary-200 bg-secondary-50/50">
              <Button
                type="submit"
                disabled={createMutation.isPending || !imageFile}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
              >
                {createMutation.isPending ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseForm}
                className="flex-1 border-secondary-300"
              >
                Close
              </Button>
            </div>
          </form>
        </Dialog>
      </motion.div>
    </div>
  );
}
