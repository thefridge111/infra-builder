import { TestBed } from '@angular/core/testing';
import { CanvasStateService } from './state';
import { CanvasNode } from './models';

function node(id: string, parentId?: string): CanvasNode {
  return {
    id,
    type: 'ec2',
    label: id,
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    ports: [],
    properties: {},
    parentId,
  };
}

describe('CanvasStateService', () => {
  let state: CanvasStateService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    state = TestBed.inject(CanvasStateService);
  });

  it('removes a node together with its edges and descendants', () => {
    state.addNode(node('vpc'));
    state.addNode(node('ec2', 'vpc'));
    state.addNode(node('other'));
    state.addEdge({
      id: 'e1',
      kind: 'depends-on',
      sourceNodeId: 'ec2',
      sourcePortId: 'right',
      targetNodeId: 'other',
      targetPortId: 'left',
    });

    state.removeNodes(['vpc']);

    expect(state.nodes().map((n) => n.id)).toEqual(['other']);
    expect(state.edges()).toEqual([]);
  });

  it('undoes and redoes structural changes', () => {
    state.addNode(node('a'));
    state.updateNode('a', { label: 'renamed' });
    expect(state.canUndo()).toBe(true);

    state.undo();
    expect(state.node('a')?.label).toBe('a');

    state.undo();
    expect(state.nodes()).toEqual([]);
    expect(state.canUndo()).toBe(false);

    state.redo();
    expect(state.nodes().length).toBe(1);
    expect(state.canRedo()).toBe(true);
  });

  it('does not record transient moves in history', () => {
    state.addNode(node('a'));
    state.moveNodes([{ id: 'a', x: 40, y: 60 }]);
    state.undo();
    expect(state.nodes()).toEqual([]);
  });

  it('bumps version only on structural changes', () => {
    const before = state.version();
    state.moveNodes([]);
    expect(state.version()).toBe(before);
    state.addNode(node('a'));
    expect(state.version()).toBe(before + 1);
  });

  it('defaults edge kind when loading legacy state', () => {
    state.loadState({
      nodes: [node('a'), node('b')],
      edges: [
        {
          id: 'e',
          sourceNodeId: 'a',
          sourcePortId: 'r',
          targetNodeId: 'b',
          targetPortId: 'l',
        } as never,
      ],
      selectedNodeIds: [],
      selectedEdgeIds: [],
      zoom: 1,
      panX: 0,
      panY: 0,
    });
    expect(state.edges()[0].kind).toBe('depends-on');
    expect(state.canUndo()).toBe(false);
  });
});
