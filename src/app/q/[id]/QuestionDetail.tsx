"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { Button, Card, Eyebrow, Pill } from "@/components/ui";
import { getExplanation } from "@/lib/content";
import type { Explanation, OptionLabel, Question } from "@/lib/content/types";
import { Md } from "@/components/Md";

const LABELS: OptionLabel[] = ["A", "B", "C", "D"];

/**
 * Full explanation + the contributor editor. The editor appears only when
 * /api/explanations says the signed-in user is on the allowlist. Every save
 * is a new row, so history is kept server-side.
 */
export function QuestionDetail({ question }: { question: Question }) {
  const bundled = getExplanation(question.id);
  const [override, setOverride] = useState<Explanation | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Explanation | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/explanations?question_id=${encodeURIComponent(question.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.override) setOverride(d.override as Explanation);
        setCanEdit(Boolean(d.can_edit));
      })
      .catch(() => {});
  }, [question.id]);

  const current = override ?? bundled ?? null;

  const startEdit = () => {
    setDraft(
      current ?? {
        question_id: question.id,
        body_md: "",
        distractor_notes: { A: "", B: "", C: "", D: "" },
        concept_ref: "",
        verified: false,
        author: "",
        updated_at: new Date().toISOString(),
      },
    );
    setEditing(true);
  };

  const save = async () => {
    if (!draft) return;
    const res = await fetch("/api/explanations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
    const d = await res.json();
    if (d.ok) {
      setOverride({ ...draft, updated_at: new Date().toISOString() });
      setEditing(false);
      setMsg("Saved.");
    } else {
      setMsg(d.error ?? "Could not save.");
    }
  };

  return (
    <div className="space-y-5">
      <Link href="/practice" className="text-[13px] text-muted hover:text-fg">← Practice</Link>
      <QuestionCard question={question} mode="detail" />

      {override && (
        <p className="text-[12px] text-faint">Showing a contributor edit by {override.author} ({new Date(override.updated_at).toLocaleDateString()}){override.verified ? ", verified" : ", unverified"}.</p>
      )}

      {canEdit && !editing && (
        <Button variant="secondary" onClick={startEdit}>Edit explanation</Button>
      )}
      {msg && <p className="text-[13px] text-muted">{msg}</p>}

      {editing && draft && (
        <Card className="space-y-3 animate-rise">
          <Eyebrow>Edit explanation</Eyebrow>
          <label className="block text-[13px] text-muted">Step by step
            <textarea value={draft.body_md} onChange={(e) => setDraft({ ...draft, body_md: e.target.value })} rows={8} className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2 text-[14px] font-mono" />
          </label>
          {LABELS.map((l) => (
            <label key={l} className="block text-[13px] text-muted">Option {l}
              <input value={draft.distractor_notes[l]} onChange={(e) => setDraft({ ...draft, distractor_notes: { ...draft.distractor_notes, [l]: e.target.value } })} className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2 text-[14px] min-h-11" />
            </label>
          ))}
          <label className="block text-[13px] text-muted">Concept
            <input value={draft.concept_ref} onChange={(e) => setDraft({ ...draft, concept_ref: e.target.value })} className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2 text-[14px] min-h-11" />
          </label>
          <label className="flex items-center gap-2 text-[14px] min-h-11">
            <input type="checkbox" checked={draft.verified} onChange={(e) => setDraft({ ...draft, verified: e.target.checked })} className="h-5 w-5" />
            Mark as verified <Pill tone={draft.verified ? "ok" : "neutral"}>{draft.verified ? "verified" : "draft"}</Pill>
          </label>
          <div>
            <p className="text-[12px] text-faint mb-1">Preview</p>
            <div className="rounded-xl border border-line p-3"><Md text={draft.body_md} className="text-[14px]" /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save}>Save</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
