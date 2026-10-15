"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { importPatients, type ImportResult } from "@/lib/actions/import";

const TARGET_FIELDS = [
  { key: "first_name", label: "First name", required: true },
  { key: "last_name", label: "Last name", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "instagram_id", label: "Instagram handle", required: false },
  { key: "source", label: "Source", required: false },
  { key: "preferred_channel", label: "Preferred contact method", required: false },
  { key: "tags", label: "Tags (comma-separated)", required: false },
] as const;

type Step = "upload" | "map" | "done";

const inputClass =
  "rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none";

export function ImportWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "update">("skip");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState("");

  async function handleFile(file: File) {
    setParseError("");
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        defval: "",
      });

      if (parsed.length === 0) {
        setParseError("That file doesn't have any rows in it.");
        return;
      }

      setFilename(file.name);
      setHeaders(Object.keys(parsed[0]));
      setRows(parsed);

      // Best-effort auto-map by matching header names loosely.
      const autoMap: Record<string, string> = {};
      for (const field of TARGET_FIELDS) {
        const match = Object.keys(parsed[0]).find((h) =>
          h.toLowerCase().replace(/[^a-z]/g, "").includes(field.key.replace(/_/g, "")),
        );
        if (match) autoMap[field.key] = match;
      }
      setMapping(autoMap);
      setStep("map");
    } catch {
      setParseError("Couldn't read that file -- is it a valid .csv or .xlsx?");
    }
  }

  async function handleImport() {
    setImporting(true);
    const mappedRows = rows.map((row) => ({
      first_name: mapping.first_name ? row[mapping.first_name] : "",
      last_name: mapping.last_name ? row[mapping.last_name] : "",
      phone: mapping.phone ? row[mapping.phone] : "",
      email: mapping.email ? row[mapping.email] : "",
      instagram_id: mapping.instagram_id ? row[mapping.instagram_id] : "",
      source: mapping.source ? row[mapping.source] : "",
      preferred_channel: mapping.preferred_channel ? row[mapping.preferred_channel] : "",
      tags: mapping.tags ? row[mapping.tags] : "",
    }));

    const res = await importPatients(mappedRows, filename, duplicateStrategy);
    setResult(res);
    setImporting(false);
    setStep("done");
    router.refresh();
  }

  if (step === "upload") {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-7 shadow-sm">
        <label className="block text-sm font-medium text-[var(--ink)]">
          Upload a .csv or .xlsx file
        </label>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="mt-2 block w-full text-sm text-[var(--muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--teal-soft)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--teal-deep)]"
        />
        {parseError && (
          <p className="mt-2 text-sm text-[var(--danger)]">{parseError}</p>
        )}
      </div>
    );
  }

  if (step === "map") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-7 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--ink)]">
            Map columns
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {filename} &middot; {rows.length} rows found
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {TARGET_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-[var(--muted)]">
                  {field.label}
                  {field.required && " *"}
                </label>
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={(e) =>
                    setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  className={`${inputClass} mt-1 w-full`}
                >
                  <option value="">Don&apos;t import</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <p className="text-xs text-[var(--muted)]">
              If a row&apos;s email matches an existing patient:
            </p>
            <div className="mt-2 flex gap-4 text-sm text-[var(--ink)]">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={duplicateStrategy === "skip"}
                  onChange={() => setDuplicateStrategy("skip")}
                  className="accent-[var(--teal)]"
                />
                Skip it
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={duplicateStrategy === "update"}
                  onChange={() => setDuplicateStrategy("update")}
                  className="accent-[var(--teal)]"
                />
                Update the existing record
              </label>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-4 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((row, i) => (
                <tr key={i} className="border-b border-[var(--line)] last:border-0">
                  {headers.map((h) => (
                    <td key={h} className="px-4 py-2 text-[var(--muted)]">
                      {row[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-[var(--line)] px-4 py-2 text-xs text-[var(--muted)]">
            Showing first 5 of {rows.length} rows
          </p>
        </div>

        {!mapping.first_name && (
          <p className="text-sm text-[var(--warn)]">
            Map a column to First name before importing.
          </p>
        )}

        <button
          type="button"
          disabled={!mapping.first_name || importing}
          onClick={handleImport}
          className="w-full rounded-lg bg-[var(--teal)] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)] disabled:opacity-50"
        >
          {importing ? "Importing…" : `Import ${rows.length} rows`}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-7 shadow-sm">
      <h2 className="text-sm font-semibold text-[var(--ink)]">Import complete</h2>
      <dl className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <dt className="font-data text-2xl text-[var(--teal)]">{result?.added ?? 0}</dt>
          <dd className="text-xs text-[var(--muted)]">Added</dd>
        </div>
        <div>
          <dt className="font-data text-2xl text-[var(--ink)]">{result?.updated ?? 0}</dt>
          <dd className="text-xs text-[var(--muted)]">Updated</dd>
        </div>
        <div>
          <dt className="font-data text-2xl text-[var(--muted)]">{result?.skipped ?? 0}</dt>
          <dd className="text-xs text-[var(--muted)]">Skipped</dd>
        </div>
      </dl>

      {result && result.errors.length > 0 && (
        <div className="mt-5 space-y-1 rounded-lg border border-[var(--warn)]/30 bg-[var(--warn-soft)] p-3 text-xs text-[var(--warn)]">
          {result.errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      <Link
        href="/admin/patients"
        className="mt-5 block w-full rounded-lg bg-[var(--teal)] px-4 py-2.5 text-center text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)]"
      >
        View patients
      </Link>
    </div>
  );
}
