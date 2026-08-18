import { Injectable, signal, computed } from '@angular/core';
import { CanvasNode, CanvasEdge, CanvasState } from './models';

@Injectable({ providedIn: 'root' })
export class CanvasStateService {
  readonly nodes = signal<CanvasNode[]>([]);
  readonly edges = signal<CanvasEdge[]>([]);
  readonly selectedNodeIds = signal<Set<string>>(new Set());
  readonly selectedEdgeIds = signal<Set<string>>(new Set());
  readonly zoom = signal(1);
  readonly panX = signal(0);
  readonly panY = signal(0);

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

  addNode(node: CanvasNode): void {
    this.nodes.update((nodes) => [...nodes, node]);
  }

  removeNode(id: string): void {
    this.nodes.update((nodes) => nodes.filter((n) => n.id !== id));
    this.edges.update((edges) =>
      edges.filter((e) => e.sourceNodeId !== id && e.targetNodeId !== id),
    );
    this.selectedNodeIds.update((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }

  updateNodePosition(id: string, x: number, y: number): void {
    this.nodes.update((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    );
  }

  updateNodeLabel(id: string, label: string): void {
    this.nodes.update((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, label } : n)),
    );
  }

  addEdge(edge: CanvasEdge): void {
    this.edges.update((edges) => [...edges, edge]);
  }

  removeEdge(id: string): void {
    this.edges.update((edges) => edges.filter((e) => e.id !== id));
    this.selectedEdgeIds.update((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }

  selectNode(id: string, multi = false): void {
    if (multi) {
      this.selectedNodeIds.update((ids) => {
        const next = new Set(ids);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    } else {
      this.selectedNodeIds.set(new Set([id]));
      this.selectedEdgeIds.set(new Set());
    }
  }

  selectEdge(id: string, multi = false): void {
    if (multi) {
      this.selectedEdgeIds.update((ids) => {
        const next = new Set(ids);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    } else {
      this.selectedEdgeIds.set(new Set([id]));
      this.selectedNodeIds.set(new Set());
    }
  }

  clearSelection(): void {
    this.selectedNodeIds.set(new Set());
    this.selectedEdgeIds.set(new Set());
  }

  setZoom(zoom: number): void {
    this.zoom.set(Math.max(0.1, Math.min(3, zoom)));
  }

  setPan(x: number, y: number): void {
    this.panX.set(x);
    this.panY.set(y);
  }

  loadState(state: CanvasState): void {
    this.nodes.set(state.nodes);
    this.edges.set(state.edges);
    this.selectedNodeIds.set(new Set(state.selectedNodeIds));
    this.selectedEdgeIds.set(new Set(state.selectedEdgeIds));
    this.zoom.set(state.zoom);
    this.panX.set(state.panX);
    this.panY.set(state.panY);
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
