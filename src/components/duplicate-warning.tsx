"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { findDuplicates, type DuplicateMatch } from "@/lib/actions/duplicates";

const MATCH_LABEL = { phone: "phone number", email: "email" };
const inputClass =
  "mt-1 block w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none";
const labelClass = "block text-sm font-medium text-[var(--ink)]";

// Renders the phone + email fields together, checking for an existing
// patient with the same number or address whenever either loses focus.
export function PatientIdentityFields({
  defaultPhone = "",
  defaultEmail = "",
  excludePatientId,
}: {
  defaultPhone?: string;
  defaultEmail?: string;
  excludePatientId?: string;
}) {
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState(defaultEmail);
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const [isPending, startTransition] = useTransition();

  function check(nextPhone: string, nextEmail: string) {
    if (!nextPhone.trim() && !nextEmail.trim()) {
      setMatches([]);
      return;
    }
    startTransition(async () => {
      const result = await findDuplicates(nextPhone, nextEmail, excludePatientId);
      setMatches(result);
    });
  }

  return (
    <>
      <div>
        <label className={labelClass}>Phone</label>
        <input
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => check(phone, email)}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => check(phone, email)}
          className={inputClass}
        />
      </div>

      {isPending && (
        <p className="sm:col-span-2 text-xs text-[var(--muted)]">
          Checking for existing patients…
        </p>
      )}
      {!isPending && matches.length > 0 && (
        <div className="rounded-lg border border-[var(--warn)]/30 bg-[var(--warn-soft)] px-3 py-2 text-sm text-[var(--warn)] sm:col-span-2">
          <p className="font-medium">Possible existing patient:</p>
          <ul className="mt-1 space-y-0.5">
            {matches.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/admin/patients/${m.id}`}
                  target="_blank"
                  className="underline"
                >
                  {m.first_name} {m.last_name}
                </Link>{" "}
                — same {MATCH_LABEL[m.matched_on]}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
