import { Injectable, signal, computed, effect } from '@angular/core';
import { CanvasNode, CanvasEdge, CanvasState } from './models';

const STORAGE_KEY = 'infra-builder-canvas-state';
const HISTORY_LIMIT = 100;
const SAVE_DELAY_MS = 300;

interface Snapshot {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export type NodePatch = Partial<CanvasNode> & { id: string };

@Injectable({ providedIn: 'root' })
export class CanvasStateService {
  readonly nodes = signal<CanvasNode[]>([]);
  readonly edges = signal<CanvasEdge[]>([]);
  readonly selectedNodeIds = signal<Set<string>>(new Set());
  readonly selectedEdgeIds = signal<Set<string>>(new Set());
  readonly zoom = signal(1);
  readonly panX = signal(0);
  readonly panY = signal(0);

  /** Bumped whenever the canvas must re-render everything from state. */
  readonly version = signal(0);

  private past: Snapshot[] = [];
  private future: Snapshot[] = [];
  private gesture: { snapshot: Snapshot; future: Snapshot[] } | null = null;
  private saveTimer?: ReturnType<typeof setTimeout>;
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  constructor() {
    this.loadFromStorage();
    effect(() => {
      const state = this.state();
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(
        () => this.saveToStorage(state),
        SAVE_DELAY_MS,
      );
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => {
        clearTimeout(this.saveTimer);
        this.saveToStorage(this.state());
      });
    }
  }

  private saveToStorage(state: CanvasState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save canvas state:', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.applyState(JSON.parse(stored) as CanvasState);
      }
    } catch (e) {
      console.warn('Failed to load canvas state:', e);
    }
  }

  clearStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.loadState({
      nodes: [],
      edges: [],
      selectedNodeIds: [],
      selectedEdgeIds: [],
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  }

  readonly selectedNodes = computed(() => {
    const ids = this.selectedNodeIds();
    return this.nodes().filter((n) => ids.has(n.id));
  });

  readonly selectedEdges = computed(() => {
    const ids = this.selectedEdgeIds();
    return this.edges().filter((e) => ids.has(e.id));
  });

  readonly state = computed<CanvasState>(() => ({
    nodes: this.nodes(),
    edges: this.edges(),
    selectedNodeIds: Array.from(this.selectedNodeIds()),
    selectedEdgeIds: Array.from(this.selectedEdgeIds()),
    zoom: this.zoom(),
    panX: this.panX(),
    panY: this.panY(),
  }));

  // --- History -------------------------------------------------------------

  /** Records the current nodes/edges so the next change can be undone. */
  commit(): void {
    const last = this.past[this.past.length - 1];
    if (last && last.nodes === this.nodes() && last.edges === this.edges()) {
      return;
    }
    this.past.push({ nodes: this.nodes(), edges: this.edges() });
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
    this.updateHistoryFlags();
  }

  /**
   * Starts a drag/resize: records a snapshot but keeps the redo stack until
   * endGesture() knows whether anything actually changed.
   */
  beginGesture(): void {
    this.gesture = {
      snapshot: { nodes: this.nodes(), edges: this.edges() },
      future: this.future,
    };
    this.past.push(this.gesture.snapshot);
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
    this.updateHistoryFlags();
  }

  endGesture(): void {
    const gesture = this.gesture;
    this.gesture = null;
    if (!gesture) return;
    const unchanged =
      JSON.stringify(gesture.snapshot.nodes) === JSON.stringify(this.nodes()) &&
      gesture.snapshot.edges === this.edges();
    if (unchanged && this.past[this.past.length - 1] === gesture.snapshot) {
      this.past.pop();
      this.future = gesture.future;
      this.updateHistoryFlags();
    }
  }

  undo(): void {
    const snapshot = this.past.pop();
    if (!snapshot) return;
    this.future.push({ nodes: this.nodes(), edges: this.edges() });
    this.restore(snapshot);
  }

  redo(): void {
    const snapshot = this.future.pop();
    if (!snapshot) return;
    this.past.push({ nodes: this.nodes(), edges: this.edges() });
    this.restore(snapshot);
  }

  private restore(snapshot: Snapshot): void {
    this.nodes.set(snapshot.nodes);
    this.edges.set(snapshot.edges);
    this.clearSelection();
    this.updateHistoryFlags();
    this.version.update((v) => v + 1);
  }

  private updateHistoryFlags(): void {
    this.canUndo.set(this.past.length > 0);
    this.canRedo.set(this.future.length > 0);
  }

  // --- Nodes ---------------------------------------------------------------

  addNode(node: CanvasNode): void {
    this.commit();
    this.nodes.update((nodes) => [...nodes, node]);
    this.version.update((v) => v + 1);
  }

  /** Inserts copies of a subgraph (see cloneSubgraph) and selects them. */
  paste(nodes: CanvasNode[], edges: CanvasEdge[]): void {
    if (nodes.length === 0) return;
    this.commit();
    this.nodes.update((all) => [...all, ...nodes]);
    this.edges.update((all) => [...all, ...edges]);
    this.selectNodes(nodes.map((n) => n.id));
    this.version.update((v) => v + 1);
  }

  /** Removes nodes (with their descendants and edges) and edges in one undo step. */
  remove(nodeIds: string[], edgeIds: string[] = []): void {
    if (nodeIds.length === 0 && edgeIds.length === 0) return;
    const doomedNodes = new Set<string>();
    nodeIds.forEach((id) =>
      this.descendantIds(id).forEach((d) => doomedNodes.add(d)),
    );
    const doomedEdges = new Set(edgeIds);
    this.commit();
    this.nodes.update((nodes) => nodes.filter((n) => !doomedNodes.has(n.id)));
    this.edges.update((edges) =>
      edges.filter(
        (e) =>
          !doomedEdges.has(e.id) &&
          !doomedNodes.has(e.sourceNodeId) &&
          !doomedNodes.has(e.targetNodeId),
      ),
    );
    this.clearSelection();
    this.version.update((v) => v + 1);
  }

  removeNodes(ids: string[]): void {
    this.remove(ids, []);
  }

  removeEdges(ids: string[]): void {
    this.remove([], ids);
  }

  /**
   * Persistent node change (label, size, parent, properties). Undoable unless
   * `record` is false, for gestures that already committed at their start.
   */
  updateNode(id: string, patch: Partial<CanvasNode>, record = true): void {
    this.updateNodes([{ ...patch, id }], record);
  }

  updateNodes(patches: NodePatch[], record = true): void {
    if (patches.length === 0) return;
    if (record) this.commit();
    const byId = new Map(patches.map((p) => [p.id, p]));
    this.nodes.update((nodes) =>
      nodes.map((n) => {
        const patch = byId.get(n.id);
        return patch ? { ...n, ...patch } : n;
      }),
    );
    this.version.update((v) => v + 1);
  }

  /** Transient position update during drag. Call commit() on drag start. */
  moveNodes(moves: { id: string; x: number; y: number }[]): void {
    const byId = new Map(moves.map((m) => [m.id, m]));
    this.nodes.update((nodes) =>
      nodes.map((n) => {
        const m = byId.get(n.id);
        return m ? { ...n, x: m.x, y: m.y } : n;
      }),
    );
  }

  node(id: string): CanvasNode | undefined {
    return this.nodes().find((n) => n.id === id);
  }

  /** The node itself plus all nested children. */
  descendantIds(id: string): string[] {
    const result = [id];
    const seen = new Set(result);
    for (let i = 0; i < result.length; i++) {
      this.nodes()
        .filter((n) => n.parentId === result[i] && !seen.has(n.id))
        .forEach((n) => {
          seen.add(n.id);
          result.push(n.id);
        });
    }
    return result;
  }

  // --- Edges ---------------------------------------------------------------

  addEdge(edge: CanvasEdge): void {
    this.commit();
    this.edges.update((edges) => [...edges, edge]);
    this.version.update((v) => v + 1);
  }

  updateEdge(id: string, patch: Partial<CanvasEdge>): void {
    this.commit();
    this.edges.update((edges) =>
      edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
    this.version.update((v) => v + 1);
  }

  // --- Selection -----------------------------------------------------------

  selectNode(id: string, multi = false): void {
    if (multi) {
      this.selectedNodeIds.update((ids) => toggle(ids, id));
    } else {
      this.selectedNodeIds.set(new Set([id]));
      this.selectedEdgeIds.set(new Set());
    }
  }

  selectNodes(ids: string[]): void {
    this.selectedNodeIds.set(new Set(ids));
    this.selectedEdgeIds.set(new Set());
  }

  selectEdge(id: string, multi = false): void {
    if (multi) {
      this.selectedEdgeIds.update((ids) => toggle(ids, id));
    } else {
      this.selectedEdgeIds.set(new Set([id]));
      this.selectedNodeIds.set(new Set());
    }
  }

  clearSelection(): void {
    this.selectedNodeIds.set(new Set());
    this.selectedEdgeIds.set(new Set());
  }

  // --- Viewport ------------------------------------------------------------

  setZoom(zoom: number): void {
    this.zoom.set(Math.max(0.1, Math.min(3, zoom)));
  }

  setPan(x: number, y: number): void {
    this.panX.set(x);
    this.panY.set(y);
  }

  // --- Load ----------------------------------------------------------------

  /** Replaces the whole diagram. Undoable. */
  loadState(state: CanvasState): void {
    this.commit();
    this.applyState(state);
    this.version.update((v) => v + 1);
  }

  private applyState(state: CanvasState): void {
    this.nodes.set(sanitizeParents(state.nodes ?? []));
    this.edges.set(
      (state.edges ?? []).map((e) => ({ ...e, kind: e.kind ?? 'depends-on' })),
    );
    this.selectedNodeIds.set(new Set(state.selectedNodeIds));
    this.selectedEdgeIds.set(new Set(state.selectedEdgeIds));
    this.zoom.set(state.zoom ?? 1);
    this.panX.set(state.panX ?? 0);
    this.panY.set(state.panY ?? 0);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  createNodeId(): string {
    return this.generateId();
  }

  createEdgeId(): string {
    return this.generateId();
  }
}

function toggle(ids: Set<string>, id: string): Set<string> {
  const next = new Set(ids);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

/** Drops parent links that point nowhere or would form a cycle. */
function sanitizeParents(nodes: CanvasNode[]): CanvasNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return nodes.map((node) => {
    if (!node.parentId) return node;
    const seen = new Set([node.id]);
    let current = byId.get(node.parentId);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    const valid = byId.has(node.parentId) && !current;
    return valid ? node : { ...node, parentId: undefined };
  });
}
