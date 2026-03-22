import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui";
import { listHrAttendance } from "@/app/actions/hr";
import { HrAttendanceUpload } from "@/components/hr/hr-attendance-upload";
import { HrAttendanceTable } from "@/components/hr/hr-attendance-table";

export default async function HrAttendancePage() {
	const rows = await listHrAttendance();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Attendance"
				subtitle="Upload normalized Excel (Employee Code, Date, In, Out, Duration, OT, Type)"
				action={
					<div className="flex gap-2">
						<Button asChild variant="ghost" size="sm">
							<Link href="/hr">Back</Link>
						</Button>
						<HrAttendanceUpload />
					</div>
				}
			/>
			<HrAttendanceTable rows={rows} />
		</div>
	);
}
