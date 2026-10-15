"use client";

import { useState, useTransition } from "react";
import { callPatient } from "@/lib/actions/call";

export function CallButton({ patientId }: { patientId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await callPatient(patientId);
            setMessage(result.message);
          })
        }
        className="rounded-lg border border-[var(--teal)]/40 bg-[var(--teal-soft)] px-3 py-1 text-xs font-medium text-[var(--teal-deep)] hover:bg-[var(--teal)] hover:text-white disabled:opacity-60"
      >
        {isPending ? "Calling…" : "Call"}
      </button>
      {message && (
        <p className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2 text-right text-xs text-[var(--muted)] shadow-lg">
          {message}
        </p>
      )}
    </div>
  );
}
