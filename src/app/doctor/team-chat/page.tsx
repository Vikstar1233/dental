import { getProfile } from "@/lib/get-profile";
import { TeamChat } from "@/components/team-chat";

export default async function DoctorTeamChatPage() {
  await getProfile();

  return (
    <div className="px-10 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-2xl text-[var(--ink)]">
          Team chat
        </h1>
        <TeamChat redirectTo="/doctor/team-chat" />
      </div>
    </div>
  );
}
