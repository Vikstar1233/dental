import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { createClient } from "@/lib/supabase/server";
import { ImportWizard } from "./wizard";

export default async function ImportPatientsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: imports } = await supabase
    .from("imports")
    .select("id, filename, rows_added, rows_updated, rows_skipped, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="px-10 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-[var(--ink)]">
            Import patients
          </h1>
          <Link
            href="/admin/patients"
            className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]"
          >
            &larr; Back to patients
          </Link>
        </div>

        <ImportWizard />

        {imports && imports.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-2 font-medium">File</th>
                  <th className="px-4 py-2 font-medium">Added</th>
                  <th className="px-4 py-2 font-medium">Updated</th>
                  <th className="px-4 py-2 font-medium">Skipped</th>
                  <th className="px-4 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((imp) => (
                  <tr key={imp.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-4 py-2 text-[var(--ink)]">{imp.filename}</td>
                    <td className="px-4 py-2 font-data text-[var(--ink)]">
                      {imp.rows_added}
                    </td>
                    <td className="px-4 py-2 font-data text-[var(--ink)]">
                      {imp.rows_updated}
                    </td>
                    <td className="px-4 py-2 font-data text-[var(--ink)]">
                      {imp.rows_skipped}
                    </td>
                    <td className="px-4 py-2 font-data text-xs text-[var(--muted)]">
                      {new Date(imp.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
