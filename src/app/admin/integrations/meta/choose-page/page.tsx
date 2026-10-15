import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { getIntegration } from "@/lib/integrations/store";
import { choosePage } from "../actions";

export default async function ChoosePagePage() {
  await requireAdmin();

  const integration = await getIntegration("meta");
  const config = (integration?.config ?? {}) as {
    pending_pages?: { id: string; name: string }[];
  };
  const pages = config.pending_pages ?? [];

  if (pages.length === 0) {
    redirect(
      `/admin/integrations?error=${encodeURIComponent("No pending Facebook Pages -- try connecting again.")}`,
    );
  }

  return (
    <div className="px-10 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="font-display text-2xl text-[var(--ink)]">
          Choose a Facebook Page
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Lead forms will be pulled from whichever Page you pick here.
        </p>

        <div className="space-y-2">
          {pages.map((page) => (
            <form key={page.id} action={choosePage}>
              <input type="hidden" name="page_id" value={page.id} />
              <button
                type="submit"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-left text-sm font-medium text-[var(--ink)] shadow-sm hover:border-[var(--teal)]"
              >
                {page.name}
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
