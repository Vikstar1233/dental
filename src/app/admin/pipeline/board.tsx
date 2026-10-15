"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { STAGES, STAGE_LABEL } from "@/lib/stages";
import { updateStageOnBoard } from "@/lib/actions/patients";

type Card = {
  id: string;
  first_name: string;
  last_name: string;
  source: string;
  stage: string;
  assigned_to: string | null;
  stage_changed_at: string;
};

type Doctor = { id: string; full_name: string; email: string };

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function PipelineBoard({
  initialCards,
  doctors,
}: {
  initialCards: Card[];
  doctors: Doctor[];
}) {
  const [cards, setCards] = useState(initialCards);
  const [doctorFilter, setDoctorFilter] = useState<string>("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const doctorName = (id: string | null) =>
    doctors.find((d) => d.id === id)?.full_name || "Unassigned";

  const visibleCards = doctorFilter
    ? cards.filter((c) => c.assigned_to === doctorFilter)
    : cards;

  function handleDrop(stage: string) {
    if (!draggingId) return;
    const cardId = draggingId;
    setDraggingId(null);

    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? { ...c, stage, stage_changed_at: new Date().toISOString() }
          : c,
      ),
    );

    startTransition(() => {
      updateStageOnBoard(cardId, stage);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <label className="text-xs text-[var(--muted)]">Doctor</label>
        <select
          value={doctorFilter}
          onChange={(e) => setDoctorFilter(e.target.value)}
          className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
        >
          <option value="">All doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.full_name || d.email}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageCards = visibleCards.filter((c) => c.stage === stage);
          return (
            <div
              key={stage}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(stage)}
              className="w-64 flex-none rounded-xl border border-[var(--line)] bg-[var(--porcelain)] p-3"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {STAGE_LABEL[stage]}
                </h2>
                <span className="font-data text-xs text-[var(--muted)]">
                  {stageCards.length}
                </span>
              </div>

              <div className="space-y-2">
                {stageCards.map((card) => {
                  const days = daysSince(card.stage_changed_at);
                  const flag = days >= 7 ? "red" : days >= 3 ? "amber" : null;
                  return (
                    <Link
                      key={card.id}
                      href={`/admin/patients/${card.id}`}
                      draggable
                      onDragStart={() => setDraggingId(card.id)}
                      className={`block cursor-grab rounded-lg border bg-[var(--surface)] p-3 text-sm shadow-sm active:cursor-grabbing ${
                        flag === "red"
                          ? "border-[var(--danger)]/40"
                          : flag === "amber"
                            ? "border-[var(--warn)]/40"
                            : "border-[var(--line)]"
                      }`}
                    >
                      <p className="font-medium text-[var(--ink)]">
                        {card.first_name} {card.last_name}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {card.source} &middot; {doctorName(card.assigned_to)}
                      </p>
                      <p
                        className={`mt-1 font-data text-xs ${
                          flag === "red"
                            ? "text-[var(--danger)]"
                            : flag === "amber"
                              ? "text-[var(--warn)]"
                              : "text-[var(--muted)]"
                        }`}
                      >
                        {days === 0 ? "Today" : `${days}d in stage`}
                      </p>
                    </Link>
                  );
                })}
                {stageCards.length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-[var(--muted)]">
                    No patients
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
