import { listHrAttendance } from "@/app/actions/hr";
import { HrAttendanceClient } from "@/components/hr/hr-attendance-client";

export default async function HrAttendancePage() {
	const rows = await listHrAttendance();

	return <HrAttendanceClient initialRows={rows} />;
}
