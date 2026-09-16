// Per-browser identity: which member the user has claimed to be in a group.
// Stored as a map of { groupSlug: memberId } in localStorage.

const KEY = "divvy:identity:v1";

function readMap(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function getIdentity(slug: string): string | null {
  return readMap()[slug] ?? null;
}

export function setIdentity(slug: string, memberId: string) {
  const map = readMap();
  map[slug] = memberId;
  writeMap(map);
}

export function clearIdentity(slug: string) {
  const map = readMap();
  delete map[slug];
  writeMap(map);
}
