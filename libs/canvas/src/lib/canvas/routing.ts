type Side = 'top' | 'right' | 'bottom' | 'left';

interface Anchor {
  x: number;
  y: number;
  side: Side;
}

interface Point {
  x: number;
  y: number;
}

const STUB = 24;

const DIRECTION: Record<Side, Point> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

/**
 * Orthogonal route between two ports: leave each port perpendicular to its
 * side, then connect the stubs with the first bend pattern that doesn't
 * double back through either node.
 */
export function routeEdge(from: Anchor, to: Anchor): number[] {
  const a = DIRECTION[from.side];
  const b = DIRECTION[to.side];
  const p1 = { x: from.x + a.x * STUB, y: from.y + a.y * STUB };
  const p2 = { x: to.x + b.x * STUB, y: to.y + b.y * STUB };
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  // Prefer continuing in the port's own direction before turning.
  const straightFirst = a.x !== 0 ? { x: p2.x, y: p1.y } : { x: p1.x, y: p2.y };
  const turnFirst = a.x !== 0 ? { x: p1.x, y: p2.y } : { x: p2.x, y: p1.y };
  const candidates: Point[][] = [
    [straightFirst],
    [turnFirst],
    [
      { x: midX, y: p1.y },
      { x: midX, y: p2.y },
    ],
    [
      { x: p1.x, y: midY },
      { x: p2.x, y: midY },
    ],
    [
      { x: p1.x, y: midY },
      { x: p2.x, y: midY },
    ],
  ];

  // The first leg must continue away from the source; the last must arrive
  // heading into the target port (opposite its outward direction).
  const valid = (bends: Point[]) => {
    const first = bends[0];
    const last = bends[bends.length - 1];
    const leavesOk = (first.x - p1.x) * a.x + (first.y - p1.y) * a.y >= 0;
    const arrivesOk = (p2.x - last.x) * b.x + (p2.y - last.y) * b.y <= 0;
    return leavesOk && arrivesOk;
  };

  const bends = candidates.find(valid) ?? candidates[candidates.length - 1];
  return [from, p1, ...bends, p2, to].flatMap((p) => [p.x, p.y]);
}
