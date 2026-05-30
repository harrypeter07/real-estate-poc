import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { CustomersTableClient } from "@/components/customers/customers-table-client";
import { getCustomers } from "@/app/actions/customers";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} registered plot buyers`}
        action={
          <Link href="/customers/new" className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto h-10 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-teal-600 via-teal-650 to-emerald-600 text-white hover:from-teal-500 hover:via-teal-550 hover:to-emerald-500 border border-teal-500/20 shadow-sm hover:shadow-[0_4px_15px_rgba(13,148,136,0.25)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-300 cursor-pointer flex items-center justify-center">
              <Plus className="h-4 w-4 mr-1.5 shrink-0" />
              New Customer
            </Button>
          </Link>
        }
      />

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 p-16 text-center bg-white shadow-sm max-w-xl mx-auto mt-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-50 border border-zinc-100 mb-5 shadow-inner text-zinc-500">
            <Users className="h-8 w-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900">👥 No customers added yet</h3>
          <p className="text-sm text-zinc-500 mt-2 mb-6 max-w-sm">
            Create your first customer to start managing buyers, documenting details, and capturing KYC records.
          </p>
          <Link href="/customers/new">
            <Button size="default" className="h-10 px-5 rounded-xl text-xs font-black bg-gradient-to-r from-teal-600 via-teal-650 to-emerald-600 text-white hover:from-teal-500 hover:via-teal-550 hover:to-emerald-500 border border-teal-500/20 shadow-md hover:shadow-[0_6px_20px_rgba(13,148,136,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-300 cursor-pointer">
              <Plus className="h-4 w-4 mr-1.5 shrink-0 animate-bounce" />
              Create Customer
            </Button>
          </Link>
        </div>
      ) : (
        <CustomersTableClient customers={customers as any} variant="admin" />
      )}
    </div>
  );
}
