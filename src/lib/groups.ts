/** Study-group helpers shared by the API route and the panel. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function generateGroupCode(rand: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return out;
}

export function normalizeGroupCode(input: string): string | null {
  const c = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z0-9]{6}$/.test(c) ? c : null;
}

export interface GroupMember {
  user_id: string;
  display_name: string;
  answered: number;
  accuracy: number;
  last_mock: { correct: number; total: number } | null;
  weakest_topic: string | null;
  weakest_accuracy: number | null;
  last_active: string | null;
}

export interface GroupView {
  id: string;
  code: string;
  name: string;
  members: GroupMember[];
}
