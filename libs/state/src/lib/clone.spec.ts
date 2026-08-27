import { cloneSubgraph } from './clone';
import { CanvasEdge, CanvasNode } from './models';

function node(id: string, parentId?: string): CanvasNode {
  return {
    id,
    type: 'ec2',
    label: id,
    x: 10,
    y: 10,
    width: 1,
    height: 1,
    ports: [],
    properties: {},
    parentId,
  };
}

describe('cloneSubgraph', () => {
  it('copies nodes, keeps internal parent links and drops external ones', () => {
    let n = 0;
    const edges: CanvasEdge[] = [
      {
        id: 'e1',
        kind: 'depends-on',
        sourceNodeId: 'a',
        sourcePortId: 'r',
        targetNodeId: 'b',
        targetPortId: 'l',
      },
      {
        id: 'e2',
        kind: 'depends-on',
        sourceNodeId: 'a',
        sourcePortId: 'r',
        targetNodeId: 'c',
        targetPortId: 'l',
      },
    ];
    const copy = cloneSubgraph(
      [node('vpc'), node('a', 'vpc'), node('b', 'a'), node('c')],
      edges,
      new Set(['a', 'b']),
      { x: 5, y: 5 },
      () => `n${++n}`,
    );
    expect(copy.nodes.map((c) => [c.id, c.parentId, c.x])).toEqual([
      ['n1', undefined, 15],
      ['n2', 'n1', 15],
    ]);
    expect(copy.edges.length).toBe(1);
    expect(copy.edges[0]).toMatchObject({
      sourceNodeId: 'n1',
      targetNodeId: 'n2',
    });
  });
});
