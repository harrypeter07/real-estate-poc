export default function SuperAdminLoading() {
	return (
		<div className="space-y-6 animate-pulse">
			<div className="space-y-2">
				<div className="h-7 w-48 rounded bg-zinc-200" />
				<div className="h-4 w-96 max-w-full rounded bg-zinc-100" />
			</div>
			<div className="rounded-lg border border-zinc-200 bg-white p-6">
				<div className="h-5 w-32 rounded bg-zinc-200 mb-4" />
				<div className="h-9 w-72 rounded bg-zinc-100 mb-6" />
				<div className="space-y-3">
					<div className="h-4 w-full rounded bg-zinc-100" />
					<div className="h-4 w-full rounded bg-zinc-100" />
					<div className="h-4 w-[85%] rounded bg-zinc-100" />
				</div>
			</div>
		</div>
	);
}
