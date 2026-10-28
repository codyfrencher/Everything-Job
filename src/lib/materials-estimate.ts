import type { Material } from "@prisma/client";

export type MaterialEstimateLine = {
  materialId: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
};

export type MaterialsEstimate = {
  lines: MaterialEstimateLine[];
  total: number;
};

function materialQuantity(
  material: Material,
  { sqft, rooms }: { sqft: number | null; rooms: number | null },
): number | null {
  switch (material.calcType) {
    case "PER_SQFT":
      if (!sqft || material.rate <= 0) return null;
      return Math.ceil(sqft / material.rate);
    case "PER_ROOM":
      if (!rooms || material.rate <= 0) return null;
      return Math.ceil(rooms * material.rate);
    case "FLAT":
      // Independent of job size — always shows, e.g. a set of PPE or a
      // dumpster that gets used on every job regardless of scale.
      return Math.max(1, Math.round(material.rate));
  }
}

// A "guesstimate," not a quote: quantities round up per material rather
// than trying to net out partial units across the job.
export function computeMaterialsEstimate(
  materials: Material[],
  inputs: { sqft: number | null; rooms: number | null },
): MaterialsEstimate {
  const lines: MaterialEstimateLine[] = [];

  for (const material of materials) {
    const quantity = materialQuantity(material, inputs);
    if (quantity === null) continue;
    const lineTotal = quantity * material.unitCost;
    lines.push({
      materialId: material.id,
      name: material.name,
      unit: material.unit,
      quantity,
      unitCost: material.unitCost,
      lineTotal,
    });
  }

  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  return { lines, total };
}

// Best-effort scrape of the Scope of Work text for a size, so the
// materials inputs aren't always starting from a blank field — never
// authoritative, just a starting point the dispatcher can correct.
export function guessDimensionsFromScope(scope: string | null): {
  sqft: number | null;
  rooms: number | null;
} {
  if (!scope) return { sqft: null, rooms: null };

  const sqftMatch = scope.match(
    /(\d{2,6})\s*(?:sq\.?\s*ft\.?|sqft|square\s+feet)/i,
  );
  const roomsMatch = scope.match(/(\d{1,2})\s*(?:rooms?|bedrooms?)/i);

  return {
    sqft: sqftMatch ? parseInt(sqftMatch[1], 10) : null,
    rooms: roomsMatch ? parseInt(roomsMatch[1], 10) : null,
  };
}
