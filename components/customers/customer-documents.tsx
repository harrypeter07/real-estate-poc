"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Trash2, Upload } from "lucide-react";
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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { ReceiptViewer } from "@/components/shared/receipt-viewer";
import { createCustomerDocument, deleteCustomerDocument } from "@/app/actions/customer-documents";

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

const salariedTypes = [
  { id: "aadhar", label: "Aadhar" },
  { id: "pan", label: "PAN" },
  { id: "bank_statement", label: "Bank statement" },
  { id: "salary_slip", label: "Salary slips" },
];

const businessTypes = [
  { id: "aadhar", label: "Aadhar" },
  { id: "pan", label: "PAN" },
  { id: "itr", label: "ITR" },
  { id: "gst", label: "GST" },
];

export function CustomerDocuments({
  customerId,
  initialDocs,
  customerName,
}: {
  customerId: string;
  customerName: string;
  initialDocs: DocRow[];
}) {
  const [docs, setDocs] = useState<DocRow[]>(initialDocs);
  const [category, setCategory] = useState<"salaried" | "business">("salaried");
  const [docType, setDocType] = useState<string>("aadhar");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const types = useMemo(
    () => (category === "salaried" ? salariedTypes : businessTypes),
    [category]
  );

  async function uploadFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
      const path = `customers/${customerId}/${category}/${docType}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from("customer-docs")
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (error) throw error;

      const res = await createCustomerDocument({
        customer_id: customerId,
        doc_category: category,
        doc_type: docType,
        file_path: path,
        file_name: file.name,
        mime_type: file.type,
        notes,
      });
      if (!res.success) {
        toast.error("Failed to save document", { description: res.error });
        return;
      }

      toast.success("Document uploaded");
      // optimistic append
      setDocs((d) => [
        {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : String(Date.now()),
          customer_id: customerId,
          doc_category: category,
          doc_type: docType,
          file_path: path,
          file_name: file.name,
          mime_type: file.type,
          notes: notes || null,
          created_at: new Date().toISOString(),
        },
        ...d,
      ]);
      setNotes("");
    } catch (e: any) {
      toast.error("Upload failed", { description: e?.message || String(e) });
    } finally {
      setUploading(false);
    }
  }

  async function removeDoc(row: DocRow) {
    const res = await deleteCustomerDocument(row.id, customerId);
    if (!res.success) {
      toast.error("Delete failed", { description: res.error });
      return;
    }
    setDocs((d) => d.filter((x) => x.id !== row.id));
    toast.success("Deleted");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-500">
          Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-zinc-200 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-zinc-500 mb-1">Category</div>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salaried">Salaried</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Document type</div>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Upload</div>
              <Input
                type="file"
                disabled={uploading}
                accept="image/*,application/pdf"
                onChange={(e) => uploadFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">Notes (optional)</div>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Any notes for ${customerName}`}
            />
          </div>
          <div className="flex justify-end">
            <Badge variant="secondary" className="text-[10px]">
              Bucket: customer-docs
            </Badge>
          </div>
        </div>

        {docs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500">
            No documents uploaded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map((d) => (
              <div
                key={d.id}
                className="rounded-lg border border-zinc-200 p-3 bg-white"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-zinc-400" />
                      <div className="font-semibold text-sm truncate">
                        {d.file_name ?? d.file_path.split("/").pop()}
                      </div>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {d.doc_category.toUpperCase()} • {d.doc_type}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">
                      Stored at: <span className="font-mono">customer-docs/{d.file_path}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      className="inline-flex"
                      href={
                        createClient()
                          .storage.from("customer-docs")
                          .getPublicUrl(d.file_path).data.publicUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      title="Open"
                    >
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8">
                        <Upload className="h-4 w-4" />
                      </Button>
                    </a>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete document?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the database record. (The storage file can be cleaned later.)
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeDoc(d)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {d.mime_type?.startsWith("image/") ? (
                  <div className="mt-3">
                    <ReceiptViewer
                      bucket="customer-docs"
                      receiptPath={d.file_path}
                      title="Preview"
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

