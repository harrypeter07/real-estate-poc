import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { AdvisorsManager } from "@/components/advisors/advisors-manager";
import { getAdvisors } from "@/app/actions/advisors";

export default async function AdvisorsPage() {
  const advisors = await getAdvisors();

  const rows = (advisors ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
    code: a.code,
    phone: a.phone,
    email: a.email ?? null,
    is_active: a.is_active ?? true,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Advisors"
        subtitle={`${advisors.length} registered channel partners`}
        action={
          <Link href="/advisors/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Advisor
            </Button>
          </Link>
        }
      />

      {advisors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
            <Users className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold">No advisors yet</h3>
          <p className="text-sm text-zinc-500 mt-1 mb-4">
            Start by adding your first channel partner
          </p>
          <Link href="/advisors/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Advisor
            </Button>
          </Link>
        </div>
      ) : (
        <AdvisorsManager advisors={rows} />
      )}
    </div>
  );
}
