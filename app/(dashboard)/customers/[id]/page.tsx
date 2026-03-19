import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, User, Phone, MapPin } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { getCustomerById } from "@/app/actions/customers";
import { getCustomerDocuments } from "@/app/actions/customer-documents";
import { CustomerDocuments } from "@/components/customers/customer-documents";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  const docs = await getCustomerDocuments(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        subtitle="Customer profile"
        showBackButton
        action={
          <Link href={`/customers/${id}/edit`}>
            <Button size="sm" variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-zinc-900">
              <User className="h-4 w-4 text-zinc-400" />
              <div className="font-semibold">{customer.name}</div>
              {customer.is_active === false ? (
                <Badge variant="secondary" className="text-[10px]">
                  Inactive
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-700">
              <Phone className="h-4 w-4 text-zinc-400" />
              {customer.phone}
            </div>
            {customer.address ? (
              <div className="flex items-start gap-2 text-sm text-zinc-700">
                <MapPin className="h-4 w-4 text-zinc-400 mt-0.5" />
                <div className="whitespace-pre-wrap">{customer.address}</div>
              </div>
            ) : null}
            {customer.notes ? (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 whitespace-pre-wrap">
                {customer.notes}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <CustomerDocuments
            customerId={id}
            customerName={customer.name}
            initialDocs={docs as any[]}
          />
        </div>
      </div>
    </div>
  );
}
