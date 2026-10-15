import { requireAdmin } from "@/lib/require-admin";
import { TeamChat } from "@/components/team-chat";

export default async function AdminTeamChatPage() {
  await requireAdmin();

  return (
    <div className="px-10 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-2xl text-[var(--ink)]">
          Team chat
        </h1>
        <TeamChat redirectTo="/admin/team-chat" />
      </div>
    </div>
  );
}
