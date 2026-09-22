"use client";
import { useEffect, useState } from "react";
import { Button, Group, GroupFooter, GroupHeader, Row, Tag } from "./ui";
import { getTopic } from "@/lib/content";
import type { GroupView } from "@/lib/groups";
import { shareLink } from "@/lib/share";
import { track } from "@/lib/analytics";

/**
 * Study groups on the Account screen. A six-character code; members see a
 * compare table of answered / accuracy / last mock / weakest topic. Signed-in
 * only, because the aggregates come from synced attempts.
 */
export function GroupsPanel({ signedIn }: { signedIn: boolean }) {
  const [groups, setGroups] = useState<GroupView[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    fetch("/api/groups").then((r) => r.json()).then((d) => { setGroups(d.groups ?? []); setEnabled(d.enabled !== false); }).catch(() => setGroups([]));
  }, [signedIn]);

  const post = async (body: Record<string, string>) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/groups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json();
      if (d.ok) { setGroups(d.groups); setMode("idle"); setName(""); setCode(""); track(body.action === "create" ? "group_created" : "group_joined"); }
      else setMsg(d.message ?? "That didn’t work. Try again.");
    } catch { setMsg("Couldn’t reach the server."); }
    setBusy(false);
  };

  if (!enabled) return null;
  if (!signedIn) {
    return (
      <>
        <GroupHeader>Study group</GroupHeader>
        <Group><Row title="Compare with your club" detail="Sign in to create or join a group with a six-character code." /></Group>
      </>
    );
  }

  const field = "flex-1 min-h-[44px] rounded-[10px] bg-fill/70 px-3 text-body focus:bg-group focus:ring-2 focus:ring-accent outline-none";

  return (
    <>
      <GroupHeader>Study group</GroupHeader>
      {groups?.map((g) => (
        <div key={g.id} className="mb-3">
          <Group>
            <Row title={g.name} detail={`Code ${g.code} · ${g.members.length} member${g.members.length === 1 ? "" : "s"}`}>
              <Button variant="tinted" size="compact" onClick={async () => { const r = await shareLink({ title: `Join ${g.name} on Valence`, text: `Join my USNCO study group on Valence with code ${g.code}`, url: `/signin?join=${g.code}`, kind: "group" }); setMsg(r === "copied" ? "Invite link copied." : null); }}>Invite</Button>
            </Row>
            {g.members.map((m) => (
              <Row
                key={m.user_id}
                title={m.display_name}
                detail={m.answered ? `${m.answered} answered · ${m.accuracy}%${m.weakest_topic ? ` · weakest ${getTopic(m.weakest_topic)?.name ?? m.weakest_topic}` : ""}` : "No synced practice yet"}
                value={m.last_mock ? <span className="tnum">{m.last_mock.correct}/{m.last_mock.total}</span> : <Tag tone="neutral">no mock</Tag>}
              />
            ))}
            <button type="button" onClick={() => post({ action: "leave", group_id: g.id })} className="w-full text-left px-4 min-h-[44px] text-body text-red hover:bg-fill/60">Leave group</button>
          </Group>
        </div>
      ))}
      <Group>
        {mode === "idle" && (
          <>
            <Row onClick={() => setMode("create")} chevron title="Create a group" detail="You get a code to share" />
            <Row onClick={() => setMode("join")} chevron title="Join with a code" />
          </>
        )}
        {mode === "create" && (
          <form onSubmit={(e) => { e.preventDefault(); post({ action: "create", name }); }} className="px-4 py-3 flex gap-2">
            <label className="sr-only" htmlFor="gname">Group name</label>
            <input id="gname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name, e.g. Ridge HS Chem" maxLength={40} className={field} autoFocus />
            <Button type="submit" size="compact" disabled={busy || !name.trim()}>Create</Button>
            <Button type="button" variant="plain" size="compact" onClick={() => setMode("idle")}>Cancel</Button>
          </form>
        )}
        {mode === "join" && (
          <form onSubmit={(e) => { e.preventDefault(); post({ action: "join", code }); }} className="px-4 py-3 flex gap-2">
            <label className="sr-only" htmlFor="gcode">Group code</label>
            <input id="gcode" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC234" maxLength={7} className={`${field} tracking-[0.15em] font-mono uppercase`} autoFocus />
            <Button type="submit" size="compact" disabled={busy || code.replace(/[^A-Z0-9]/gi, "").length !== 6}>Join</Button>
            <Button type="button" variant="plain" size="compact" onClick={() => setMode("idle")}>Cancel</Button>
          </form>
        )}
      </Group>
      <GroupFooter>{msg ?? "Members see each other’s totals, accuracy, last mock and weakest topic, never individual answers."}</GroupFooter>
    </>
  );
}
