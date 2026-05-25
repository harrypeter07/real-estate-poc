"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Trash2,
  Upload,
  Download,
  Eye,
  RefreshCw,
  Loader2,
  Shield,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Image as ImageIcon,
  FolderOpen
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { deleteCustomerDocument } from "@/app/actions/customer-documents";
import { updateCustomerKycUrl, updateCustomerKycStatus } from "@/app/actions/customers";

type DocRow = {
  id: string;
  customer_id: string;
  doc_category: string;
  doc_type: string;
  file_path: string;
  file_name: string | null;
  mime_type: string | null;
  notes: string | null;
  created_at: string;
};

interface CustomerDocumentsProps {
  customerId: string;
  customerName: string;
  initialDocs: DocRow[];
  customer?: {
    aadhaar_url?: string | null;
    pan_url?: string | null;
    photo_url?: string | null;
    kyc_status?: string | null;
  };
}

export function CustomerDocuments({
  customerId,
  customerName,
  initialDocs,
  customer,
}: CustomerDocumentsProps) {
  const [docs, setDocs] = useState<DocRow[]>(initialDocs);
  const [aadhaarUrl, setAadhaarUrl] = useState(customer?.aadhaar_url || "");
  const [panUrl, setPanUrl] = useState(customer?.pan_url || "");
  const [photoUrl, setPhotoUrl] = useState(customer?.photo_url || "");
  const [kycStatus, setKycStatus] = useState(customer?.kyc_status || "pending");

  const [aadhaarPreview, setAadhaarPreview] = useState("");
  const [panPreview, setPanPreview] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");

  const [tenantSlug, setTenantSlug] = useState<string>("default-tenant");
  const [uploadingField, setUploadingField] = useState<"aadhaar" | "pan" | "photo" | null>(null);
  const [updatingKycStatus, setUpdatingKycStatus] = useState(false);

  // Fetch the tenant slug for storage structure
  useEffect(() => {
    async function loadTenant() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const bId = user.user_metadata?.business_id;
        if (!bId) return;

        const { data: business } = await supabase
          .from("businesses")
          .select("name")
          .eq("id", bId)
          .maybeSingle();

        if (business?.name) {
          const slug = business.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
          setTenantSlug(slug || bId);
        } else {
          setTenantSlug(bId);
        }
      } catch (e) {
        console.error("Error loading tenant for KYC upload:", e);
      }
    }
    loadTenant();
  }, []);

  // Fetch signed preview URLs for all three KYC fields on mount or when they change
  useEffect(() => {
    async function loadAadhaarUrl() {
      if (!aadhaarUrl) {
        setAadhaarPreview("");
        return;
      }
      try {
        const supabase = createClient();
        const { data } = await supabase.storage
          .from("customer-docs")
          .createSignedUrl(aadhaarUrl, 60 * 60);
        if (data?.signedUrl) {
          setAadhaarPreview(data.signedUrl);
        }
      } catch (e) {
        console.error("Error loading Aadhaar signed URL:", e);
      }
    }
    loadAadhaarUrl();
  }, [aadhaarUrl]);

  useEffect(() => {
    async function loadPanUrl() {
      if (!panUrl) {
        setPanPreview("");
        return;
      }
      try {
        const supabase = createClient();
        const { data } = await supabase.storage
          .from("customer-docs")
          .createSignedUrl(panUrl, 60 * 60);
        if (data?.signedUrl) {
          setPanPreview(data.signedUrl);
        }
      } catch (e) {
        console.error("Error loading PAN signed URL:", e);
      }
    }
    loadPanUrl();
  }, [panUrl]);

  useEffect(() => {
    async function loadPhotoUrl() {
      if (!photoUrl) {
        setPhotoPreview("");
        return;
      }
      try {
        const supabase = createClient();
        const { data } = await supabase.storage
          .from("customer-docs")
          .createSignedUrl(photoUrl, 60 * 60);
        if (data?.signedUrl) {
          setPhotoPreview(data.signedUrl);
        }
      } catch (e) {
        console.error("Error loading Photo signed URL:", e);
      }
    }
    loadPhotoUrl();
  }, [photoUrl]);

  // Clean filename extractor
  const getFileNameFromPath = (pathValue: string) => {
    if (!pathValue) return "";
    const parts = pathValue.split("/");
    const fileNameWithTimestamp = parts[parts.length - 1];
    const dashIndex = fileNameWithTimestamp.indexOf("-");
    if (dashIndex !== -1) {
      return fileNameWithTimestamp.substring(dashIndex + 1);
    }
    return fileNameWithTimestamp;
  };

  // Status handler
  const handleKycStatusChange = async (newStatus: string) => {
    if (newStatus === "verified") {
      if (!aadhaarUrl || !panUrl || !photoUrl) {
        toast.error("Cannot verify KYC", {
          description: "All documents (Aadhaar Card, PAN Card, and Customer Photo) must be uploaded before marking KYC as Verified.",
        });
        return;
      }
    }
    setUpdatingKycStatus(true);
    try {
      const res = await updateCustomerKycStatus(customerId, newStatus);
      if (!res.success) {
        toast.error("Failed to update KYC status", { description: res.error });
        return;
      }
      setKycStatus(newStatus);
      toast.success(`KYC status updated to ${newStatus}`);
    } catch (e: any) {
      toast.error("Error updating status", { description: e?.message || String(e) });
    } finally {
      setUpdatingKycStatus(false);
    }
  };

  // Upload/Replace handler
  async function handleKycReplace(file: File | null, field: "aadhaar" | "pan" | "photo") {
    if (!file) return;

    // File validation: Size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large", { description: "Maximum file size allowed is 5MB." });
      return;
    }

    // File validation: Type
    const fileType = file.type || "";
    if (field === "photo") {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(fileType)) {
        toast.error("Invalid file type", { description: "Please upload an image file (JPG, PNG, WEBP)." });
        return;
      }
    } else {
      const allowed = ["image/jpeg", "image/png", "application/pdf"];
      if (!allowed.includes(fileType)) {
        toast.error("Invalid file type", { description: "Please upload a PDF or image file (JPG, PNG)." });
        return;
      }
    }

    setUploadingField(field);
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
      const path = `tenant/${tenantSlug}/customers/${customerId}/${field}/${Date.now()}-${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from("customer-docs")
        .upload(path, file, { upsert: true, contentType: file.type || undefined });

      if (uploadErr) throw uploadErr;

      const fieldName = field === "aadhaar" ? "aadhaar_url" : field === "pan" ? "pan_url" : "photo_url";
      const res = await updateCustomerKycUrl(customerId, fieldName, path);

      if (!res.success) {
        toast.error("Failed to save KYC update", { description: res.error });
        return;
      }

      toast.success(`${field === "aadhaar" ? "Aadhaar Card" : field === "pan" ? "PAN Card" : "Customer Photo"} updated successfully.`);
      if (field === "aadhaar") setAadhaarUrl(path);
      else if (field === "pan") setPanUrl(path);
      else if (field === "photo") setPhotoUrl(path);

      // Auto update KYC status to uploaded if all 3 are present but was pending
      if (kycStatus === "pending") {
        const hasAadhaar = field === "aadhaar" || !!aadhaarUrl;
        const hasPan = field === "pan" || !!panUrl;
        const hasPhoto = field === "photo" || !!photoUrl;
        if (hasAadhaar && hasPan && hasPhoto) {
          await handleKycStatusChange("uploaded");
        }
      }
    } catch (e: any) {
      toast.error("Upload failed", { description: e?.message || String(e) });
    } finally {
      setUploadingField(null);
    }
  }

  // View document in new tab
  async function viewKycDoc(path: string) {
    if (!path) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("customer-docs")
        .createSignedUrl(path, 60 * 60);

      if (error || !data?.signedUrl) {
        toast.error("Cannot open file", { description: error?.message ?? "Signed URL not available" });
        return;
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error("Cannot open file", { description: e?.message || String(e) });
    }
  }

  // Download document
  async function downloadKycDoc(path: string, defaultName: string) {
    if (!path) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("customer-docs")
        .createSignedUrl(path, 60 * 60);

      if (error || !data?.signedUrl) {
        toast.error("Cannot download file", { description: error?.message ?? "Signed URL not available" });
        return;
      }

      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", defaultName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Download started");
    } catch (e: any) {
      toast.error("Download failed", { description: e?.message || String(e) });
    }
  }

  // Remove generic legacy doc
  async function removeDoc(row: DocRow) {
    const res = await deleteCustomerDocument(row.id, customerId);
    if (!res.success) {
      toast.error("Delete failed", { description: res.error });
      return;
    }
    setDocs((d) => d.filter((x) => x.id !== row.id));
    toast.success("Deleted additional document");
  }

  return (
    <Card className="border border-zinc-200/80 shadow-md rounded-2xl overflow-hidden bg-white">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-100 p-5 bg-zinc-50/50">
        <div>
          <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-650" />
            KYC Documents
          </CardTitle>
          <p className="text-xs text-zinc-500 mt-1">Official identification and profile photo verified for {customerName}</p>
        </div>

        {/* KYC Status Controls */}
        <div className="flex items-center gap-2.5">
          {updatingKycStatus ? (
            <div className="flex items-center text-xs text-zinc-400 font-medium px-3.5 py-1.5 bg-zinc-50 border border-zinc-100 rounded-xl">
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Updating...
            </div>
          ) : kycStatus === "verified" ? (
            <button
              type="button"
              onClick={() => handleKycStatusChange("pending")}
              title="Click to mark Pending"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-150 rounded-xl px-3.5 py-1.5 uppercase transition-all duration-200 cursor-pointer shadow-sm hover:scale-102 active:scale-98"
            >
              🟢 Verified
            </button>
          ) : kycStatus === "uploaded" ? (
            <button
              type="button"
              onClick={() => handleKycStatusChange("verified")}
              title="Click to Verify KYC"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-150 rounded-xl px-3.5 py-1.5 uppercase transition-all duration-200 cursor-pointer shadow-sm hover:scale-102 active:scale-98"
            >
              🟡 Uploaded
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleKycStatusChange("verified")}
              title="Click to Verify KYC"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-150 rounded-xl px-3.5 py-1.5 uppercase transition-all duration-200 cursor-pointer shadow-sm hover:scale-102 active:scale-98 animate-pulse"
            >
              🔴 Pending
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4">
          
          {/* Row 1: Aadhaar Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-zinc-200 bg-white hover:shadow-sm transition-all duration-200 gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="p-3 bg-teal-50 text-teal-650 rounded-xl border border-teal-100 shrink-0">
                <FileText className="h-5.5 w-5.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-zinc-800">Aadhaar Card</h4>
                {aadhaarUrl ? (
                  <p className="text-xs text-zinc-500 font-medium truncate max-w-[200px] sm:max-w-xs md:max-w-md mt-0.5" title={getFileNameFromPath(aadhaarUrl)}>
                    {getFileNameFromPath(aadhaarUrl)}
                  </p>
                ) : (
                  <p className="text-xs text-red-500 font-bold flex items-center gap-1 mt-0.5">
                    <AlertCircle className="h-3.5 w-3.5" /> Not uploaded yet
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {aadhaarUrl && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50"
                    onClick={() => viewKycDoc(aadhaarUrl)}
                  >
                    <Eye className="h-4 w-4" /> View
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50"
                    onClick={() => downloadKycDoc(aadhaarUrl, `Aadhaar_${customerName.replace(/\s+/g, "_")}${aadhaarUrl.endsWith(".pdf") ? ".pdf" : ".jpg"}`)}
                  >
                    <Download className="h-4 w-4" /> Download
                  </Button>
                </>
              )}
              
              <label className="relative">
                <input
                  type="file"
                  accept="image/png, image/jpeg, application/pdf"
                  onChange={(e) => handleKycReplace(e.target.files?.[0] ?? null, "aadhaar")}
                  className="hidden"
                  disabled={uploadingField === "aadhaar"}
                />
                <span className={`inline-flex items-center justify-center h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shadow-sm border border-teal-200 bg-teal-50/50 hover:bg-teal-50 text-teal-700 transition-colors ${uploadingField === "aadhaar" ? "opacity-50 pointer-events-none" : ""}`}>
                  {uploadingField === "aadhaar" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-650" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {aadhaarUrl ? "Replace" : "Upload"}
                </span>
              </label>
            </div>
          </div>

          {/* Row 2: PAN Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-zinc-200 bg-white hover:shadow-sm transition-all duration-200 gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="p-3 bg-indigo-50 text-indigo-650 rounded-xl border border-indigo-100 shrink-0">
                <CreditCard className="h-5.5 w-5.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-zinc-800">PAN Card</h4>
                {panUrl ? (
                  <p className="text-xs text-zinc-500 font-medium truncate max-w-[200px] sm:max-w-xs md:max-w-md mt-0.5" title={getFileNameFromPath(panUrl)}>
                    {getFileNameFromPath(panUrl)}
                  </p>
                ) : (
                  <p className="text-xs text-red-500 font-bold flex items-center gap-1 mt-0.5">
                    <AlertCircle className="h-3.5 w-3.5" /> Not uploaded yet
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {panUrl && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50"
                    onClick={() => viewKycDoc(panUrl)}
                  >
                    <Eye className="h-4 w-4" /> View
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50"
                    onClick={() => downloadKycDoc(panUrl, `PAN_${customerName.replace(/\s+/g, "_")}${panUrl.endsWith(".pdf") ? ".pdf" : ".jpg"}`)}
                  >
                    <Download className="h-4 w-4" /> Download
                  </Button>
                </>
              )}
              
              <label className="relative">
                <input
                  type="file"
                  accept="image/png, image/jpeg, application/pdf"
                  onChange={(e) => handleKycReplace(e.target.files?.[0] ?? null, "pan")}
                  className="hidden"
                  disabled={uploadingField === "pan"}
                />
                <span className={`inline-flex items-center justify-center h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shadow-sm border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 transition-colors ${uploadingField === "pan" ? "opacity-50 pointer-events-none" : ""}`}>
                  {uploadingField === "pan" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-650" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {panUrl ? "Replace" : "Upload"}
                </span>
              </label>
            </div>
          </div>

          {/* Row 3: Customer Photo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-zinc-200 bg-white hover:shadow-sm transition-all duration-200 gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-zinc-200 bg-zinc-50 shrink-0 shadow-inner flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Customer photo" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-zinc-400" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-zinc-800">Customer Photo</h4>
                {photoUrl ? (
                  <p className="text-xs text-zinc-500 font-medium truncate max-w-[200px] sm:max-w-xs md:max-w-md mt-0.5" title={getFileNameFromPath(photoUrl)}>
                    {getFileNameFromPath(photoUrl)}
                  </p>
                ) : (
                  <p className="text-xs text-red-500 font-bold flex items-center gap-1 mt-0.5">
                    <AlertCircle className="h-3.5 w-3.5" /> No photo uploaded
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {photoUrl && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50"
                    onClick={() => viewKycDoc(photoUrl)}
                  >
                    <Eye className="h-4 w-4" /> View
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50"
                    onClick={() => downloadKycDoc(photoUrl, `Photo_${customerName.replace(/\s+/g, "_")}.jpg`)}
                  >
                    <Download className="h-4 w-4" /> Download
                  </Button>
                </>
              )}

              <label className="relative">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={(e) => handleKycReplace(e.target.files?.[0] ?? null, "photo")}
                  className="hidden"
                  disabled={uploadingField === "photo"}
                />
                <span className={`inline-flex items-center justify-center h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shadow-sm border border-emerald-250 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 transition-colors ${uploadingField === "photo" ? "opacity-50 pointer-events-none" : ""}`}>
                  {uploadingField === "photo" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-650" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {photoUrl ? "Replace Photo" : "Upload Photo"}
                </span>
              </label>
            </div>
          </div>

        </div>

        {/* Existing Generic Documents Section (if any exist) */}
        {docs.length > 0 && (
          <div className="mt-6 pt-6 border-t border-zinc-150 animate-in fade-in duration-300">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3.5 flex items-center gap-2">
              <FolderOpen className="h-4.5 w-4.5 text-zinc-400" />
              Additional / Other Documents ({docs.length})
            </h4>
            <div className="space-y-2.5">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className="rounded-2xl border border-zinc-200 p-3.5 bg-zinc-50/30 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4.5 w-4.5 text-zinc-400 shrink-0" />
                      <div className="font-bold text-xs text-zinc-700 truncate" title={d.file_name ?? d.file_path.split("/").pop() ?? ""}>
                        {d.file_name ?? d.file_path.split("/").pop()}
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-550 mt-1 uppercase font-semibold">
                      {d.doc_category} • {d.doc_type.replace(/_/g, " ")}
                    </div>
                    {d.notes && (
                      <p className="text-[11px] text-zinc-500 italic mt-1 bg-white border border-zinc-100 rounded-lg p-1.5 px-2">
                        Note: {d.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs font-semibold gap-1 border-zinc-200 text-zinc-750 bg-white hover:bg-zinc-50"
                      onClick={() => viewKycDoc(d.file_path)}
                      title="Open"
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs font-semibold gap-1 border-zinc-200 text-zinc-755 bg-white hover:bg-zinc-50"
                      onClick={() => downloadKycDoc(d.file_path, d.file_name ?? "document")}
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-bold text-zinc-900">Delete additional document?</AlertDialogTitle>
                          <AlertDialogDescription className="text-zinc-500 text-xs">
                            This will remove the document reference record. (The storage file can be cleaned later.)
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl border border-zinc-200">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeDoc(d)}
                            className="rounded-xl bg-red-650 hover:bg-red-700 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
