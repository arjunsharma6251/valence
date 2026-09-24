"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import { SignInNudge } from "@/components/SignInNudge";
import { QuestionCard } from "@/components/QuestionCard";
import { Button, Group, GroupFooter, GroupHeader, Row, Tag } from "@/components/ui";
import { IconBack } from "@/components/icons";
import { getExplanation } from "@/lib/content";
import type { Explanation, OptionLabel, Question } from "@/lib/content/types";
import { Md } from "@/components/Md";

const LABELS: OptionLabel[] = ["A", "B", "C", "D"];

/** Full explanation + contributor editor (allowlisted, signed-in users only). */
export function QuestionDetail({ question, challenge = false }: { question: Question; challenge?: boolean }) {
  const router = useRouter();
  const bundled = getExplanation(question.id);
  useEffect(() => {
    if (challenge) track("challenge_opened", { question_id: question.id });
  }, [challenge, question.id]);
  const [override, setOverride] = useState<Explanation | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Explanation | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    fetch(`/api/explanations?question_id=${encodeURIComponent(question.id)}`)
      .then((r) => r.json())
      .then((d) => { if (d.override) setOverride(d.override as Explanation); setCanEdit(Boolean(d.can_edit)); })
      .catch(() => {});
  }, [question.id]);

  const current = override ?? bundled ?? null;
  const startEdit = () => {
    setDraft(current ?? { question_id: question.id, body_md: "", distractor_notes: { A: "", B: "", C: "", D: "" }, concept_ref: "", verified: false, author: "", updated_at: new Date().toISOString() });
    setEditing(true);
  };
  const save = async () => {
    if (!draft) return;
    const res = await fetch("/api/explanations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
    const d = await res.json();
    if (d.ok) { setOverride({ ...draft, updated_at: new Date().toISOString() }); setEditing(false); setMsg("Saved."); }
    else setMsg(d.error ?? "Could not save.");
  };

  const field = "w-full rounded-[4px] border border-line bg-canvas px-3 py-2.5 text-[16px] focus:border-ink outline-none";

  return (
    <div>
      {challenge ? (
        <Group className="mb-4">
          <Row title="A friend sent you this question" detail="Answer it, then keep going. No account needed." />
        </Group>
      ) : (
        <Link href="/practice" className="inline-flex items-center gap-0.5 text-accent text-[16px] min-h-[44px] -ml-2 pr-2 mb-1"><IconBack size={20} /> Practice</Link>
      )}
      <QuestionCard question={question} mode={challenge ? "practice" : "detail"} onAnswer={() => setAnswered(true)} onNext={challenge ? () => router.push("/practice") : undefined} nextLabel="Keep practicing" />
      {challenge && <SignInNudge context="challenge" show={answered} />}
      {override && <GroupFooter>Showing a contributor edit by {override.author} ({new Date(override.updated_at).toLocaleDateString()}){override.verified ? ", verified" : ", unverified"}.</GroupFooter>}
      {canEdit && !editing && <div className="pt-4"><Button variant="outline" className="w-full" onClick={startEdit}>Edit explanation</Button></div>}
      {msg && <GroupFooter>{msg}</GroupFooter>}

      {editing && draft && (
        <div className="animate-rise">
          <GroupHeader trailing={<Tag tone={draft.verified ? "green" : "neutral"}>{draft.verified ? "verified" : "draft"}</Tag>}>Edit explanation</GroupHeader>
          <Group>
            <div className="py-3 space-y-3">
              <label className="block text-[13px] text-ink-soft">Step by step
                <textarea value={draft.body_md} onChange={(e) => setDraft({ ...draft, body_md: e.target.value })} rows={8} className={`${field} mt-1 font-mono text-[15px]`} />
              </label>
              {LABELS.map((l) => (
                <label key={l} className="block text-[13px] text-ink-soft">Option {l}
                  <input value={draft.distractor_notes[l]} onChange={(e) => setDraft({ ...draft, distractor_notes: { ...draft.distractor_notes, [l]: e.target.value } })} className={`${field} mt-1 min-h-[44px]`} />
                </label>
              ))}
              <label className="block text-[13px] text-ink-soft">Concept
                <input value={draft.concept_ref} onChange={(e) => setDraft({ ...draft, concept_ref: e.target.value })} className={`${field} mt-1 min-h-[44px]`} />
              </label>
              <label className="flex items-center gap-3 text-[16px] min-h-[44px]">
                <input type="checkbox" checked={draft.verified} onChange={(e) => setDraft({ ...draft, verified: e.target.checked })} className="h-5 w-5 accent-[var(--accent)]" />
                Mark as verified
              </label>
            </div>
            <div className="py-3">
              <p className="text-[13px] text-ink-soft mb-1">Preview</p>
              <Md text={draft.body_md} className="text-[15px]" />
            </div>
          </Group>
          <div className="pt-4 flex gap-2">
            <Button onClick={save} className="flex-1">Save</Button>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
