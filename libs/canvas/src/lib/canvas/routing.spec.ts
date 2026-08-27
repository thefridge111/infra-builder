import { routeEdge } from './routing';

describe('routeEdge', () => {
  it('leaves each port perpendicular to its side', () => {
    const points = routeEdge(
      { x: 0, y: 0, side: 'right' },
      { x: 100, y: 50, side: 'left' },
    );
    expect(points.slice(0, 4)).toEqual([0, 0, 24, 0]);
    expect(points.slice(-4)).toEqual([76, 50, 100, 50]);
  });

  it('uses a single bend when sides are perpendicular', () => {
    const points = routeEdge(
      { x: 0, y: 0, side: 'bottom' },
      { x: 100, y: 100, side: 'left' },
    );
    expect(points).toEqual([0, 0, 0, 24, 0, 100, 76, 100, 100, 100]);
  });
});

describe('routeEdge backtracking', () => {
  it('never doubles back through the source when the target is behind it', () => {
    const points = routeEdge(
      { x: 100, y: 50, side: 'right' },
      { x: 0, y: 150, side: 'left' },
    );
    // Leaves rightwards, then drops to the mid line, then comes back to the target's left stub.
    expect(points.slice(0, 4)).toEqual([100, 50, 124, 50]);
    expect(points).toContain(-24);
    for (let i = 2; i + 3 < points.length; i += 2) {
      const goesLeftAlongSourceRow =
        points[i + 1] === 50 && points[i + 2] < points[i];
      expect(goesLeftAlongSourceRow).toBe(false);
    }
  });
});
