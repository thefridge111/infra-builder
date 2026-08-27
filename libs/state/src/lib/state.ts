import { Injectable, signal, computed, effect } from '@angular/core';
import { CanvasNode, CanvasEdge, CanvasState } from './models';

const STORAGE_KEY = 'infra-builder-canvas-state';
const HISTORY_LIMIT = 100;

interface Snapshot {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

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
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  constructor() {
    this.loadFromStorage();
    effect(() => this.saveToStorage());
  }

  private saveToStorage(): void {
    const state = this.state();
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
    this.past.push({ nodes: this.nodes(), edges: this.edges() });
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
    this.updateHistoryFlags();
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

  removeNodes(ids: string[]): void {
    if (ids.length === 0) return;
    const doomed = new Set<string>();
    ids.forEach((id) => this.descendantIds(id).forEach((d) => doomed.add(d)));
    this.commit();
    this.nodes.update((nodes) => nodes.filter((n) => !doomed.has(n.id)));
    this.edges.update((edges) =>
      edges.filter(
        (e) => !doomed.has(e.sourceNodeId) && !doomed.has(e.targetNodeId),
      ),
    );
    this.clearSelection();
    this.version.update((v) => v + 1);
  }

  /** Persistent node change (label, size, parent, properties). Undoable. */
  updateNode(id: string, patch: Partial<CanvasNode>): void {
    this.commit();
    this.nodes.update((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
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
    for (let i = 0; i < result.length; i++) {
      this.nodes()
        .filter((n) => n.parentId === result[i])
        .forEach((n) => result.push(n.id));
    }
    return result;
  }

  // --- Edges ---------------------------------------------------------------

  addEdge(edge: CanvasEdge): void {
    this.commit();
    this.edges.update((edges) => [...edges, edge]);
    this.version.update((v) => v + 1);
  }

  removeEdges(ids: string[]): void {
    if (ids.length === 0) return;
    const doomed = new Set(ids);
    this.commit();
    this.edges.update((edges) => edges.filter((e) => !doomed.has(e.id)));
    this.clearSelection();
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

  loadState(state: CanvasState): void {
    this.applyState(state);
    this.past = [];
    this.future = [];
    this.updateHistoryFlags();
    this.version.update((v) => v + 1);
  }

  private applyState(state: CanvasState): void {
    this.nodes.set(state.nodes ?? []);
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
