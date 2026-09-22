"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { GroupHeader } from "./ui";
import { useStore } from "@/lib/store";

interface Row { user_id: string; display_name: string; answered: number; accuracy: number; best_mock: { correct: number; total: number } | null; rank: number }

/**
 * This week's leaderboard: answered count, accuracy, best mock. Opt-in,
 * aggregates only, resets every Monday. Rendered as an editorial table.
 */
export function Leaderboard({ userId }: { userId?: string | null }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const me = useStore((s) => s.profile);
  useEffect(() => {
    fetch("/api/leaderboard").then((r) => r.json()).then((d) => { setRows(d.rows ?? []); setEnabled(d.enabled !== false); }).catch(() => setRows([]));
  }, []);
  if (!enabled || rows === null) return null;
  return (
    <div>
      <GroupHeader trailing="Resets Monday">This week</GroupHeader>
      {rows.length === 0 ? (
        <p className="border-t border-line pt-4 text-[15px] text-ink-soft">
          Nobody on the board yet. <Link href="/signin" className="text-ink hover:text-accent">Add your name</Link> and answer a few questions.
        </p>
      ) : (
        <table className="w-full border-t border-line text-[15px]">
          <thead>
            <tr className="mono">
              <th className="text-left font-normal py-2 w-8">#</th>
              <th className="text-left font-normal py-2">Name</th>
              <th className="text-right font-normal py-2">Answered</th>
              <th className="text-right font-normal py-2">Acc.</th>
              <th className="text-right font-normal py-2 hidden sm:table-cell">Best mock</th>
            </tr>
          </thead>
          <tbody className="list">
            {rows.map((r) => {
              const mine = userId ? r.user_id === userId : false;
              return (
                <tr key={r.user_id} className={mine ? "text-accent" : ""}>
                  <td className="mono py-3">{r.rank}</td>
                  <td className="py-3 truncate max-w-[40vw]">{r.display_name}{mine ? " · you" : ""}</td>
                  <td className="py-3 text-right tnum">{r.answered}</td>
                  <td className="py-3 text-right tnum">{r.accuracy}%</td>
                  <td className="py-3 text-right tnum hidden sm:table-cell">{r.best_mock ? `${r.best_mock.correct}/${r.best_mock.total}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {!me.public && rows.length > 0 && (
        <p className="pt-3 text-[13px] text-grey"><Link href="/signin" className="text-ink-soft hover:text-accent">Add your name</Link> to appear here.</p>
      )}
    </div>
  );
}
