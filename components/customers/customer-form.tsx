"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, FileText, Trash2, Eye, User, MapPin, Shield, CreditCard, Image as ImageIcon } from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SearchableCombobox,
} from "@/components/ui";
import { customerSchema, type CustomerFormValues } from "@/lib/validations/customer";
import { isDev } from "@/lib/is-dev";
import { createCustomer, updateCustomer } from "@/app/actions/customers";
import { createClient } from "@/lib/supabase/client";

interface CustomerFormProps {
  mode: "create" | "edit";
  initialData?: any;
  advisors: any[];
  redirectTo?: string;
}

export function CustomerForm({
  mode,
  initialData,
  advisors,
  redirectTo = "/customers",
}: CustomerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusText, setStatusText] = useState("");
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string>("default-tenant");
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>("");

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      id: initialData?.id ?? "",
      name: initialData?.name ?? "",
      phone: initialData?.phone ?? "",
      alternate_phone: initialData?.alternate_phone ?? "",
      address: initialData?.address ?? "",
      birth_date: initialData?.birth_date ?? "",
      advisor_id: initialData?.advisor_id ?? null,
      route: initialData?.route ?? "",
      notes: initialData?.notes ?? "",
      is_active: initialData?.is_active ?? true,
      aadhaar_url: initialData?.aadhaar_url ?? "",
      pan_url: initialData?.pan_url ?? "",
      photo_url: initialData?.photo_url ?? "",
      aadhaar_number: initialData?.aadhaar_number ?? "",
      pan_number: initialData?.pan_number ?? "",
      kyc_status: initialData?.kyc_status ?? "pending",
    },
  });

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

  // Pre-generate a customer ID on client mount if creating
  useEffect(() => {
    if (mode === "create" && !form.getValues("id")) {
      const newId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "";
      form.setValue("id", newId);
    }
  }, [mode, form]);

  const customerId = form.watch("id");
  const aadhaarUrl = form.watch("aadhaar_url");
  const panUrl = form.watch("pan_url");
  const photoUrl = form.watch("photo_url");

  // Fetch photo preview URL whenever photoUrl changes
  useEffect(() => {
    async function loadPhotoPreview() {
      if (!photoUrl) {
        setPhotoPreviewUrl("");
        return;
      }
      try {
        const supabase = createClient();
        const { data, error } = await supabase.storage
          .from("customer-docs")
          .createSignedUrl(photoUrl, 60 * 60);
        if (data?.signedUrl) {
          setPhotoPreviewUrl(data.signedUrl);
        }
      } catch (e) {
        console.error("Error loading photo preview:", e);
      }
    }
    loadPhotoPreview();
  }, [photoUrl]);

  async function handleKycUpload(file: File | null, field: "aadhaar" | "pan" | "photo") {
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

    if (!customerId) {
      toast.error("Customer ID missing. Please wait a moment and try again.");
      return;
    }

    setUploadingField(field);
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
      const path = `tenant/${tenantSlug}/customers/${customerId}/${field}/${Date.now()}-${safeName}`;
      
      const { error } = await supabase.storage
        .from("customer-docs")
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
        
      if (error) throw error;
      
      form.setValue(`${field}_url`, path, { shouldDirty: true });
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} uploaded successfully.`);
    } catch (e: any) {
      toast.error("Upload failed", { description: e?.message || String(e) });
    } finally {
      setUploadingField(null);
    }
  }

  function removeFile(field: "aadhaar" | "pan" | "photo") {
    form.setValue(`${field}_url`, "", { shouldDirty: true });
    toast.success(`Removed ${field} attachment.`);
  }

  const handleViewDocument = async (pathValue: string) => {
    if (!pathValue) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("customer-docs")
        .createSignedUrl(pathValue, 60 * 60);
        
      if (error || !data?.signedUrl) {
        toast.error("Cannot open file", { description: error?.message ?? "Signed URL not available" });
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error("Cannot open file", { description: e?.message || String(e) });
    }
  };

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

  const fillMockData = () => {
    const names = ["Vijay Sharma", "Rahul Gupta", "Sunita Bai", "Ganesh Raut", "Deepak Tighare", "Manisha Kolhe"];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const routes = ["Wardha Road", "Hingna", "Besa", "Manish Nagar", "Mihan", "Koradi"];
    const randomRoute = routes[Math.floor(Math.random() * routes.length)];
    
    // Pick a random advisor if available
    const randomAdvisorId = advisors.length > 0 
      ? advisors[Math.floor(Math.random() * advisors.length)].id 
      : null;

    form.reset({
      name: randomName,
      phone: `99${Math.floor(Math.random() * 90000000) + 10000000}`,
      alternate_phone: `88${Math.floor(Math.random() * 90000000) + 10000000}`,
      address: `Plot No ${Math.floor(Math.random() * 500) + 1}, ${randomRoute}, Nagpur`,
      birth_date: "1990-08-20",
      advisor_id: randomAdvisorId,
      route: randomRoute,
      notes: `Interested in residential plots near ${randomRoute}. Preferred contact time: Evening.`,
      is_active: true,
    });
  };

  const playSubmitTone = (kind: "success" | "error") => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = kind === "success" ? 740 : 220;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "success" ? 0.2 : 0.15));
      osc.start(now);
      osc.stop(now + (kind === "success" ? 0.22 : 0.17));
      setTimeout(() => void ctx.close(), 300);
    } catch {}
  };

  async function onSubmit(values: CustomerFormValues) {
    setLoading(true);
    setSubmitStatus("idle");
    setStatusText("");
    try {
      const payload = {
        ...values,
        advisor_id: values.advisor_id === "none" ? null : values.advisor_id,
      };
      let result;
      if (mode === "edit" && initialData?.id) {
        result = await updateCustomer(initialData.id, payload);
      } else {
        result = await createCustomer(payload);
      }

      if (!result.success) {
        toast.error("Error", { description: result.error });
        setSubmitStatus("error");
        setStatusText(result.error ?? "Failed to save customer");
        playSubmitTone("error");
        return;
      }

      toast.success(mode === "edit" ? "Customer updated" : "Customer created");
      setSubmitStatus("success");
      setStatusText(mode === "edit" ? "Customer updated successfully." : "Customer created successfully.");
      playSubmitTone("success");
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      toast.error("Something went wrong");
      setSubmitStatus("error");
      setStatusText("Something went wrong while saving customer.");
      playSubmitTone("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-4xl w-full border border-zinc-200/80 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden bg-white">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-100 p-6 sm:p-8 bg-zinc-50/50">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold text-zinc-900">{mode === "edit" ? "Edit Customer" : "New Customer"}</CardTitle>
          <CardDescription className="text-xs text-zinc-500">Enter details for the plot buyer</CardDescription>
        </div>
        {isDev ? (
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={fillMockData}
            className="w-full sm:w-auto h-9 rounded-xl border-zinc-200 hover:bg-zinc-100/80 text-zinc-600 transition-all duration-200 hover:scale-102 font-medium text-xs shadow-sm flex items-center justify-center gap-1.5"
          >
            Fill Mock Data
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="p-6 sm:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Section 1: Personal Info */}
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-zinc-100">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <User className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Personal Information</h3>
                  <p className="text-[11px] text-zinc-500">Provide the buyer's full name, contact numbers, and age verification</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-zinc-700 tracking-wider uppercase">
                        Full Name <span className="text-red-500 font-bold ml-0.5">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Vijay Sharma" 
                          {...field} 
                          className="rounded-xl border-zinc-200 bg-white hover:border-zinc-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all duration-200 shadow-sm px-3.5 h-10 text-sm placeholder:text-zinc-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-zinc-700 tracking-wider uppercase">
                        Phone Number <span className="text-red-500 font-bold ml-0.5">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 9876543210"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          className="rounded-xl border-zinc-200 bg-white hover:border-zinc-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all duration-200 shadow-sm px-3.5 h-10 text-sm placeholder:text-zinc-400 font-sans"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alternate_phone"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-zinc-700 tracking-wider uppercase">Alternate Phone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 8877665544"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          className="rounded-xl border-zinc-200 bg-white hover:border-zinc-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all duration-200 shadow-sm px-3.5 h-10 text-sm placeholder:text-zinc-400 font-sans"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birth_date"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-zinc-700 tracking-wider uppercase">Birth Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value || ""} 
                          className="rounded-xl border-zinc-200 bg-white hover:border-zinc-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all duration-200 shadow-sm px-3.5 h-10 text-sm placeholder:text-zinc-400 font-sans cursor-pointer"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section 2: Address & Routing */}
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-zinc-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <MapPin className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Address & Routing</h3>
                  <p className="text-[11px] text-zinc-500">Specify the location details, routing path, and additional notes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="advisor_id"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-zinc-700 tracking-wider uppercase">Referred By (Advisor)</FormLabel>
                      <FormControl>
                        <SearchableCombobox
                          value={field.value ?? ""}
                          onChange={(v) => field.onChange(v || null)}
                          placeholder="Search advisor by name/code"
                          emptyMessage="No advisors found."
                          options={[
                            { value: "", label: "None", subtitle: "No advisor" },
                            ...advisors.map((advisor) => ({
                              value: advisor.id,
                              label: advisor.name,
                              subtitle: advisor.code ?? "",
                              keywords: `${advisor.name ?? ""} ${advisor.code ?? ""}`,
                            })),
                          ]}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="route"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-zinc-700 tracking-wider uppercase">Route / Area</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Wardha Road" 
                          {...field} 
                          className="rounded-xl border-zinc-200 bg-white hover:border-zinc-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all duration-200 shadow-sm px-3.5 h-10 text-sm placeholder:text-zinc-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[11px] font-bold text-zinc-700 tracking-wider uppercase">Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Residential address" 
                        {...field} 
                        className="rounded-xl border-zinc-200 bg-white hover:border-zinc-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all duration-200 shadow-sm px-3.5 h-10 text-sm placeholder:text-zinc-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[11px] font-bold text-zinc-700 tracking-wider uppercase">Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={3} 
                        placeholder="Additional requirements or details" 
                        {...field} 
                        className="rounded-xl border-zinc-200 bg-white hover:border-zinc-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all duration-200 shadow-sm p-3.5 text-sm placeholder:text-zinc-400 resize-none min-h-[90px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section 3: KYC Verification Documents */}
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-zinc-100">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Shield className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">KYC Verification Documents</h3>
                  <p className="text-[11px] text-zinc-500">Upload buyer's identity documents and profile photo</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Aadhaar Card Upload */}
                <div className="flex flex-col justify-between border-2 border-dashed border-zinc-250 hover:border-teal-500 hover:bg-teal-50/5 transition-all duration-300 rounded-2xl p-5 min-h-[160px] bg-zinc-50/30 group">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-teal-50 text-teal-600 rounded-xl group-hover:scale-110 transition-transform duration-300 border border-teal-100">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide block">Aadhaar Card</span>
                      <span className="text-[10px] text-zinc-400 block font-medium">PDF, JPG, PNG up to 5MB</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    {aadhaarUrl ? (
                      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-zinc-800 truncate" title={getFileNameFromPath(aadhaarUrl)}>
                              {getFileNameFromPath(aadhaarUrl)}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleViewDocument(aadhaarUrl)}
                              className="text-[10px] text-teal-600 font-medium hover:text-teal-700 hover:underline flex items-center gap-0.5 mt-0.5"
                            >
                              <Eye className="h-3 w-3" /> View Document
                            </button>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-400 hover:text-red-600 shrink-0 hover:bg-red-50 rounded-lg transition-colors"
                          onClick={() => removeFile("aadhaar")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/png, image/jpeg, application/pdf"
                          onChange={(e) => handleKycUpload(e.target.files?.[0] ?? null, "aadhaar")}
                          className="text-xs cursor-pointer h-10 px-2 bg-white rounded-xl border-zinc-200 hover:border-zinc-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 file:cursor-pointer transition-colors pt-2.5"
                          disabled={uploadingField === "aadhaar"}
                        />
                        {uploadingField === "aadhaar" && (
                          <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center text-[11px] font-semibold text-zinc-600">
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 text-zinc-500" /> Uploading...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* PAN Card Upload */}
                <div className="flex flex-col justify-between border-2 border-dashed border-zinc-250 hover:border-indigo-500 hover:bg-indigo-50/5 transition-all duration-300 rounded-2xl p-5 min-h-[160px] bg-zinc-50/30 group">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform duration-300 border border-indigo-100">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide block">PAN Card</span>
                      <span className="text-[10px] text-zinc-400 block font-medium">PDF, JPG, PNG up to 5MB</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    {panUrl ? (
                      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-zinc-800 truncate" title={getFileNameFromPath(panUrl)}>
                              {getFileNameFromPath(panUrl)}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleViewDocument(panUrl)}
                              className="text-[10px] text-indigo-600 font-medium hover:text-indigo-700 hover:underline flex items-center gap-0.5 mt-0.5"
                            >
                              <Eye className="h-3 w-3" /> View Document
                            </button>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-400 hover:text-red-600 shrink-0 hover:bg-red-50 rounded-lg transition-colors"
                          onClick={() => removeFile("pan")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/png, image/jpeg, application/pdf"
                          onChange={(e) => handleKycUpload(e.target.files?.[0] ?? null, "pan")}
                          className="text-xs cursor-pointer h-10 px-2 bg-white rounded-xl border-zinc-200 hover:border-zinc-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer transition-colors pt-2.5"
                          disabled={uploadingField === "pan"}
                        />
                        {uploadingField === "pan" && (
                          <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center text-[11px] font-semibold text-zinc-600">
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 text-zinc-500" /> Uploading...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Photo Upload */}
                <div className="flex flex-col justify-between border-2 border-dashed border-zinc-255 hover:border-emerald-500 hover:bg-emerald-50/5 transition-all duration-300 rounded-2xl p-5 min-h-[160px] bg-zinc-50/30 group">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300 border border-emerald-100">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide block">Customer Photo</span>
                      <span className="text-[10px] text-zinc-400 block font-medium">JPG, PNG, WEBP up to 5MB</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    {photoUrl ? (
                      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-2 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-9 w-9 rounded-full overflow-hidden border border-zinc-200 bg-zinc-50 shrink-0 shadow-inner">
                            {photoPreviewUrl ? (
                              <img src={photoPreviewUrl} alt="Customer Preview" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[9px] font-semibold text-zinc-400 bg-zinc-100">
                                Photo
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-zinc-800 truncate" title={getFileNameFromPath(photoUrl)}>
                              {getFileNameFromPath(photoUrl)}
                            </div>
                            <span className="text-[9px] text-emerald-650 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100 inline-block mt-0.5">
                              Ready
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-400 hover:text-red-600 shrink-0 hover:bg-red-50 rounded-lg transition-colors"
                          onClick={() => removeFile("photo")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={(e) => handleKycUpload(e.target.files?.[0] ?? null, "photo")}
                          className="text-xs cursor-pointer h-10 px-2 bg-white rounded-xl border-zinc-200 hover:border-zinc-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 file:cursor-pointer transition-colors pt-2.5"
                          disabled={uploadingField === "photo"}
                        />
                        {uploadingField === "photo" && (
                          <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center text-[11px] font-semibold text-zinc-600">
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 text-zinc-500" /> Uploading...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Action Buttons & Submit Status */}
            <div className="space-y-4 pt-4 border-t border-zinc-100">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.back()}
                  className="w-full sm:w-auto rounded-xl border-zinc-200 hover:bg-zinc-50 px-5 h-10 transition-all font-semibold text-zinc-700 duration-200 cursor-pointer shadow-sm border"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || (mode === "edit" && !form.formState.isDirty)}
                  className={`w-full sm:w-auto rounded-xl h-10 px-6 font-semibold shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer bg-teal-600 hover:bg-teal-700 text-white ${
                    loading || (mode === "edit" && !form.formState.isDirty) ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin text-white" />}
                  {loading ? "Submitting..." : mode === "edit" ? "Update Customer" : "Create Customer"}
                </Button>
              </div>

              {submitStatus !== "idle" && (
                <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-semibold animate-in fade-in zoom-in-95 duration-300 max-w-xl ${
                  submitStatus === "success"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}>
                  {submitStatus === "success" ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-green-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4.5 w-4.5 text-red-600 shrink-0" />
                  )}
                  <span>{statusText}</span>
                </div>
              )}
            </div>

          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
