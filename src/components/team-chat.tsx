import { getProfile } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";
import { postTeamMessage } from "@/lib/actions/team-chat";

export async function TeamChat({ redirectTo }: { redirectTo: string }) {
  const profile = await getProfile();
  const supabase = await createClient();

  const [{ data: messages }, { data: profiles }] = await Promise.all([
    supabase
      .from("staff_messages")
      .select("id, author_id, body, created_at")
      .order("created_at", { ascending: true })
      .limit(200),
    supabase.from("profiles").select("id, full_name, email, role"),
  ]);

  const authorName = (id: string) => {
    const author = profiles?.find((p) => p.id === id);
    if (!author) return "Someone";
    return author.full_name || author.email;
  };

  return (
    <div className="flex h-[75vh] flex-col rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
      <div className="flex-1 space-y-3 overflow-y-auto p-6">
        {messages?.map((message) => {
          const mine = message.author_id === profile.id;
          return (
            <div key={message.id} className={mine ? "text-right" : ""}>
              <div
                className={`inline-block max-w-md rounded-xl px-3 py-2 text-left text-sm ${
                  mine
                    ? "bg-[var(--teal)] text-white"
                    : "bg-[var(--porcelain)] text-[var(--ink)]"
                }`}
              >
                {!mine && (
                  <p className="mb-0.5 text-xs font-medium text-[var(--teal-deep)]">
                    {authorName(message.author_id)}
                  </p>
                )}
                <p>{message.body}</p>
              </div>
              <p className="mt-0.5 font-data text-[10px] text-[var(--muted)]">
                {new Date(message.created_at).toLocaleString()}
              </p>
            </div>
          );
        })}
        {messages?.length === 0 && (
          <p className="text-center text-sm text-[var(--muted)]">
            No messages yet — say hello.
          </p>
        )}
      </div>

      <form
        action={postTeamMessage}
        className="flex gap-2 border-t border-[var(--line)] p-4"
      >
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <input
          name="body"
          type="text"
          required
          placeholder="Message the team"
          className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--porcelain)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-[var(--teal)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--teal-deep)]"
        >
          Send
        </button>
      </form>
    </div>
  );
}
