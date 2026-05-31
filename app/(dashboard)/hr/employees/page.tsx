import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui";
import { listHrEmployees } from "@/app/actions/hr";
import { HrEmployeeDialog } from "@/components/hr/hr-employee-dialog";
import { HrEmployeesTable } from "@/components/hr/hr-employees-table";
import { ArrowLeft } from "lucide-react";

export default async function HrEmployeesPage() {
	const employees = await listHrEmployees();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Employees"
				subtitle="HR employee master (codes used in attendance upload)"
				action={
					<div className="flex gap-2 items-center">
						<Button asChild variant="ghost" size="sm" className="h-9 px-3 rounded-xl border border-zinc-200 bg-white font-bold hover:bg-zinc-50 hover:text-zinc-900 shadow-3xs transition-all text-xs flex items-center gap-1.5 shrink-0">
							<Link href="/hr">
								<ArrowLeft className="h-3.5 w-3.5" />
								Back
							</Link>
						</Button>
						<HrEmployeeDialog />
					</div>
				}
			/>
			<HrEmployeesTable employees={employees} />
		</div>
	);
}

