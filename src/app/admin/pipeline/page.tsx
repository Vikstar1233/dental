import { requireAdmin } from "@/lib/require-admin";
import { createClient } from "@/lib/supabase/server";
import { PipelineBoard } from "./board";

export default async function PipelinePage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: patients }, { data: doctors }] = await Promise.all([
    supabase
      .from("patients")
      .select("id, first_name, last_name, source, stage, assigned_to, stage_changed_at")
      .order("stage_changed_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "doctor")
      .order("full_name"),
  ]);

  return (
    <div className="px-10 py-10">
      <div className="space-y-6">
        <h1 className="font-display text-2xl text-[var(--ink)]">Pipeline</h1>
        <PipelineBoard initialCards={patients ?? []} doctors={doctors ?? []} />
      </div>
    </div>
  );
}
