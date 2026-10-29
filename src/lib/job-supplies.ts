import type { Material } from "@prisma/client";

// A convenience pre-check, not a calculation — real jobs are sized by
// looking at the specific rooms/objects involved, not derived from a
// formula (confirmed against real Scope of Work text: plastic sheeting
// counts, demo quantities, etc. are all hand-judged per job). This just
// saves re-checking the obvious boxes on jobs that clearly need them.
export function suggestSupplyIds(materials: Material[], scope: string | null): Set<string> {
  const suggested = new Set<string>();
  if (!scope) return suggested;

  const lowerScope = scope.toLowerCase();
  for (const material of materials) {
    if (!material.keywords) continue;
    const words = material.keywords
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);
    if (words.some((word) => lowerScope.includes(word))) {
      suggested.add(material.id);
    }
  }

  return suggested;
}
