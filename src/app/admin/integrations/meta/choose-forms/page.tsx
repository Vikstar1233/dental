import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { getIntegration } from "@/lib/integrations/store";
import { selectForms } from "../actions";

export default async function ChooseFormsPage() {
  await requireAdmin();

  const integration = await getIntegration("meta");
  const config = (integration?.config ?? {}) as {
    page_name?: string;
    available_forms?: { id: string; name: string; status: string }[];
    selected_form_ids?: string[];
  };
  const forms = config.available_forms ?? [];

  if (!config.page_name) {
    redirect(
      `/admin/integrations?error=${encodeURIComponent("Choose a Page first.")}`,
    );
  }

  return (
    <div className="px-10 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="font-display text-2xl text-[var(--ink)]">
          Which lead forms should we listen to?
        </h1>
        <p className="text-sm text-[var(--muted)]">
          On <span className="font-medium text-[var(--ink)]">{config.page_name}</span>.
          You can change this later from the integrations page.
        </p>

        {forms.length === 0 ? (
          <p className="rounded-lg border border-[var(--warn)]/30 bg-[var(--warn-soft)] px-3 py-2 text-sm text-[var(--warn)]">
            This Page has no lead forms yet. You can still finish connecting
            — new forms created later will show up here.
          </p>
        ) : null}

        <form action={selectForms} className="space-y-4">
          <div className="space-y-2">
            {forms.map((form) => (
              <label
                key={form.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm shadow-sm"
              >
                <input
                  type="checkbox"
                  name="form_id"
                  value={form.id}
                  defaultChecked={(config.selected_form_ids ?? []).includes(form.id)}
                  className="h-4 w-4 accent-[var(--teal)]"
                />
                <span className="font-medium text-[var(--ink)]">{form.name}</span>
                <span className="ml-auto text-xs capitalize text-[var(--muted)]">
                  {form.status}
                </span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--teal)] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)]"
          >
            Finish connecting
          </button>
        </form>
      </div>
    </div>
  );
}
