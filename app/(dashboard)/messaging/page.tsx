import { getMessagingDirectory } from "@/app/actions/messaging-directory";
import { MessagingDirectoryClient } from "@/components/messaging/messaging-directory-client";
import { MessagingTabs } from "@/components/messaging/messaging-tabs";

export default async function MessagingPage() {
	const people = await getMessagingDirectory();
	return (
		<div className="space-y-6">
			<MessagingTabs>
				<MessagingDirectoryClient initialPeople={people} />
			</MessagingTabs>
		</div>
	);
}
