import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  HostListener,
  effect,
  input,
  output,
  untracked,
} from '@angular/core';
import Konva from 'konva';
import {
  CanvasStateService,
  AwsServiceDefinition,
  AwsServiceType,
  CanvasNode,
  CanvasEdge,
  EdgeKind,
  Port,
  cloneSubgraph,
} from '@infra-builder/state';
import {
  AWS_SERVICE_MAP,
  EDGE_KIND_LABELS,
  resolveEdge,
  validateDiagram,
} from '@infra-builder/aws-icons';
import { routeEdge } from './routing';

const GRID_SIZE = 20;
const HEADER_HEIGHT = 28;
const MIN_CONTAINER_SIZE = 120;
const PASTE_OFFSET = 40;
const FONT = 'Inter, system-ui, sans-serif';

const EDGE_STYLE: Record<
  EdgeKind,
  { stroke: string; dash?: number[]; arrow: boolean }
> = {
  trigger: { stroke: '#e7157b', dash: [8, 4], arrow: true },
  attaches: { stroke: '#9ca3af', dash: [2, 3], arrow: false },
  network: { stroke: '#2563eb', arrow: true },
  'depends-on': { stroke: '#6b7280', arrow: true },
};

@Component({
  selector: 'lib-canvas',
  templateUrl: './canvas.html',
  styleUrl: './canvas.scss',
})
export class Canvas implements AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;

  /** Emitted on node double-click so the host can focus the label editor. */
  nodeActivated = output<string>();
  /** Hosts turn this off while a modal owns the keyboard. */
  shortcutsEnabled = input(true);

  private state = inject(CanvasStateService);
  private stage?: Konva.Stage;
  private gridLayer!: Konva.Layer;
  private containersLayer!: Konva.Layer;
  private edgesLayer!: Konva.Layer;
  private nodesLayer!: Konva.Layer;
  private portsLayer!: Konva.Layer;
  private overlayLayer!: Konva.Layer;
  private transformer!: Konva.Transformer;

  private tempLine: Konva.Line | null = null;
  private selectionRect: Konva.Rect | null = null;
  private pointerMode: 'none' | 'pan' | 'select' = 'none';
  private pointerStart = { x: 0, y: 0 };
  private dragOrigin = new Map<string, { x: number; y: number }>();
  private hoveredNodeId: string | null = null;
  private drawingFrom: string | null = null;
  private cancelEdgeDraw: (() => void) | null = null;
  private clipboard: { nodes: CanvasNode[]; edges: CanvasEdge[] } | null = null;

  constructor() {
    // Reads inside are untracked so drags and selection don't trigger re-renders.
    effect(() => {
      this.state.version();
      if (this.stage) untracked(() => this.renderAll());
    });
    effect(() => {
      this.state.zoom();
      this.state.panX();
      this.state.panY();
      if (this.stage) {
        untracked(() => {
          this.updateTransform();
          this.drawGrid();
          const zoom = this.state.zoom();
          this.transformer.anchorSize(8 / zoom);
          this.transformer.borderStrokeWidth(1 / zoom);
          this.transformer.anchorStrokeWidth(1 / zoom);
        });
      }
    });
    effect(() => {
      this.state.selectedNodeIds();
      this.state.selectedEdgeIds();
      if (this.stage) untracked(() => this.refreshSelection());
    });
  }

  ngAfterViewInit(): void {
    this.initKonva();
    this.renderAll();
  }

  ngOnDestroy(): void {
    window.removeEventListener('pointerup', this.onWindowPointerUp);
    this.stage?.destroy();
  }

  getStage(): Konva.Stage {
    return this.stage as Konva.Stage;
  }

  // --- Setup ---------------------------------------------------------------

  private initKonva(): void {
    const container = this.canvasContainer.nativeElement;
    this.stage = new Konva.Stage({
      container,
      width: container.clientWidth,
      height: container.clientHeight,
    });

    this.gridLayer = new Konva.Layer({ listening: false });
    this.containersLayer = new Konva.Layer();
    this.edgesLayer = new Konva.Layer();
    this.nodesLayer = new Konva.Layer();
    this.portsLayer = new Konva.Layer();
    this.overlayLayer = new Konva.Layer();
    this.transformer = new Konva.Transformer({
      rotateEnabled: false,
      // Corners only: mid-side anchors would sit on the container's ports.
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      anchorSize: 8,
      keepRatio: false,
      flipEnabled: false,
      borderStroke: '#3b82f6',
      anchorStroke: '#3b82f6',
      ignoreStroke: true,
    });
    this.overlayLayer.add(this.transformer);

    // Containers sit under edges so connections inside a VPC stay clickable.
    this.stage.add(
      this.gridLayer,
      this.containersLayer,
      this.edgesLayer,
      this.nodesLayer,
      this.portsLayer,
      this.overlayLayer,
    );

    this.setupStageEvents();
    this.setupTransformer();
    window.addEventListener('pointerup', this.onWindowPointerUp);
  }

  /** Ends any gesture whose pointer was released outside the stage. */
  private onWindowPointerUp = (e: PointerEvent): void => {
    if (this.stage?.container().contains(e.target as Node)) return;
    this.pointerMode = 'none';
    this.stage?.container().style.removeProperty('cursor');
    this.selectionRect?.destroy();
    this.selectionRect = null;
    this.cancelEdgeDraw?.();
  };

  @HostListener('window:resize')
  onResize(): void {
    if (!this.stage) return;
    const container = this.canvasContainer.nativeElement;
    this.stage.width(container.clientWidth);
    this.stage.height(container.clientHeight);
    this.drawGrid();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    if (!this.shortcutsEnabled()) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (mod && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        this.state.redo();
      } else {
        this.state.undo();
      }
    } else if (mod && key === 'y') {
      e.preventDefault();
      this.state.redo();
    } else if (mod && key === 'a') {
      e.preventDefault();
      this.state.selectNodes(this.state.nodes().map((n) => n.id));
    } else if (mod && key === 'c') {
      this.copySelection();
    } else if (mod && key === 'v') {
      e.preventDefault();
      this.paste();
    } else if (mod && key === 'd') {
      e.preventDefault();
      if (this.state.selectedNodeIds().size === 0) return;
      this.copySelection();
      this.paste();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.deleteSelection();
    } else if (e.key === 'Escape') {
      this.state.clearSelection();
    } else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const step = e.shiftKey ? GRID_SIZE * 5 : GRID_SIZE;
      const dx =
        e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      this.nudgeSelection(dx, dy, !e.repeat);
    }
  }

  // --- Public actions ------------------------------------------------------

  deleteSelection(): void {
    this.state.remove(
      [...this.state.selectedNodeIds()],
      [...this.state.selectedEdgeIds()],
    );
  }

  copySelection(): void {
    const ids = this.selectionWithDescendants();
    if (ids.size === 0) return;
    this.clipboard = cloneSubgraph(
      this.state.nodes(),
      this.state.edges(),
      ids,
      { x: 0, y: 0 },
      () => this.state.createNodeId(),
    );
  }

  paste(): void {
    if (!this.clipboard) return;
    const ids = new Set(this.clipboard.nodes.map((n) => n.id));
    const copy = cloneSubgraph(
      this.clipboard.nodes,
      this.clipboard.edges,
      ids,
      { x: PASTE_OFFSET, y: PASTE_OFFSET },
      () => this.state.createNodeId(),
    );
    // Keep the clipboard at the pasted position so repeated pastes cascade.
    this.clipboard = copy;
    // Copies that lost their parent adopt whichever container they land in.
    copy.nodes
      .filter((n) => !n.parentId)
      .forEach((n) => (n.parentId = this.findContainerFor(n)));
    this.state.paste(copy.nodes, copy.edges);
  }

  /** Adds a node at the centre of the current viewport. */
  addNode(serviceDef: AwsServiceDefinition): void {
    if (!this.stage) return;
    const center = this.toCanvasPoint({
      x: this.stage.width() / 2,
      y: this.stage.height() / 2,
    });
    this.createNode(
      serviceDef,
      center.x - serviceDef.defaultWidth / 2,
      center.y,
    );
  }

  fitToContent(): void {
    const nodes = this.state.nodes();
    if (!this.stage || nodes.length === 0) {
      this.state.setZoom(1);
      this.state.setPan(0, 0);
      return;
    }
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + n.width));
    const maxY = Math.max(...nodes.map((n) => n.y + n.height));
    const padding = 60;
    const zoom = Math.min(
      this.stage.width() / (maxX - minX + padding * 2),
      this.stage.height() / (maxY - minY + padding * 2),
      1.5,
    );
    this.state.setZoom(zoom);
    const z = this.state.zoom();
    this.state.setPan(
      (this.stage.width() - (maxX - minX) * z) / 2 - minX * z,
      (this.stage.height() - (maxY - minY) * z) / 2 - minY * z,
    );
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const serviceType = event.dataTransfer?.getData('application/aws-service');
    const serviceDef = AWS_SERVICE_MAP.get(serviceType as AwsServiceType);
    if (!serviceDef || !this.stage) return;

    const rect = this.stage.container().getBoundingClientRect();
    const point = this.toCanvasPoint({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    this.createNode(serviceDef, point.x, point.y);
  }

  private createNode(def: AwsServiceDefinition, x: number, y: number): void {
    const node: CanvasNode = {
      id: this.state.createNodeId(),
      type: def.type,
      label: def.label,
      x: snap(x),
      y: snap(y),
      width: def.defaultWidth,
      height: def.defaultHeight,
      ports: def.defaultPorts.map((p) => ({ ...p })),
      properties: {},
    };
    node.parentId = this.findContainerFor(node);
    this.state.addNode(node);
    if (def.container) this.adoptNodesInside(node.id);
    this.state.selectNode(node.id);
  }

  // --- Rendering -----------------------------------------------------------

  private renderAll(): void {
    this.transformer.nodes([]);
    this.containersLayer.destroyChildren();
    this.nodesLayer.destroyChildren();
    this.portsLayer.destroyChildren();
    this.edgesLayer.destroyChildren();
    this.hoveredNodeId = null;

    const nodes = this.state.nodes();
    const edges = this.state.edges();
    const issues = new Map<string, 'error' | 'warning'>();
    validateDiagram(nodes, edges).forEach((issue) => {
      if (issue.nodeId && issues.get(issue.nodeId) !== 'error') {
        issues.set(issue.nodeId, issue.level);
      }
    });

    // Containers first (outermost to innermost), then leaf nodes on top.
    const depth = (n: CanvasNode): number => {
      const parent = n.parentId ? this.state.node(n.parentId) : undefined;
      return parent ? 1 + depth(parent) : 0;
    };
    const order = (n: CanvasNode): number =>
      (AWS_SERVICE_MAP.get(n.type)?.container ? 0 : 1000) + depth(n);
    [...nodes]
      .sort((a, b) => order(a) - order(b))
      .forEach((node) => {
        const def = AWS_SERVICE_MAP.get(node.type);
        if (def) this.renderNode(node, def, issues.get(node.id));
      });
    edges.forEach((edge) => this.renderEdge(edge));

    this.updateTransform();
    this.drawGrid();
    this.refreshSelection();
    // Draw synchronously so hit-testing is correct before the next frame.
    this.stage?.draw();
  }

  private renderNode(
    node: CanvasNode,
    def: AwsServiceDefinition,
    issue?: 'error' | 'warning',
  ): void {
    const group = new Konva.Group({
      x: node.x,
      y: node.y,
      draggable: true,
      id: node.id,
      name: def.container ? 'node container' : 'node',
    });

    group.add(
      new Konva.Rect({
        name: 'body',
        width: node.width,
        height: node.height,
        fill: def.container ? `${def.color}0d` : 'white',
        stroke: '#d1d5db',
        strokeWidth: 1,
        cornerRadius: 4,
        ...(def.container
          ? { dash: [6, 4] }
          : {
              shadowColor: 'black',
              shadowBlur: 4,
              shadowOffset: { x: 2, y: 2 },
              shadowOpacity: 0.1,
            }),
      }),
      new Konva.Rect({
        name: 'header',
        width: node.width,
        height: HEADER_HEIGHT,
        fill: def.color,
        cornerRadius: [4, 4, 0, 0],
      }),
      new Konva.Text({
        name: 'label',
        text: node.label,
        fontSize: 12,
        fontFamily: FONT,
        fill: 'white',
        padding: 6,
        width: node.width,
        align: 'center',
        ellipsis: true,
        wrap: 'none',
      }),
    );

    if (def.container) {
      group.add(
        new Konva.Text({
          name: 'type',
          text: def.label.toUpperCase(),
          fontSize: 10,
          fontFamily: FONT,
          fill: '#6b7280',
          y: HEADER_HEIGHT + 8,
          width: node.width,
          align: 'right',
          padding: 6,
        }),
      );
    } else {
      const iconSize = 28;
      group.add(
        new Konva.Path({
          name: 'icon',
          data: def.iconPath,
          fill: def.color,
          x: node.width / 2 - iconSize / 2,
          y: HEADER_HEIGHT + 8,
          scale: { x: iconSize / 24, y: iconSize / 24 },
          listening: false,
        }),
        new Konva.Text({
          name: 'type',
          text: def.label.toUpperCase(),
          fontSize: 9,
          fontFamily: FONT,
          fill: '#6b7280',
          y: HEADER_HEIGHT + iconSize + 12,
          width: node.width,
          align: 'center',
        }),
      );
    }

    if (issue) {
      group.add(
        new Konva.Circle({
          name: 'issue',
          x: node.width,
          y: 0,
          radius: 7,
          fill: issue === 'error' ? '#ef4444' : '#f59e0b',
          stroke: 'white',
          strokeWidth: 2,
          listening: false,
        }),
        new Konva.Text({
          name: 'issue-mark',
          text: '!',
          x: node.width - 7,
          y: -7,
          width: 14,
          height: 14,
          align: 'center',
          verticalAlign: 'middle',
          fontSize: 10,
          fontStyle: 'bold',
          fontFamily: FONT,
          fill: 'white',
          listening: false,
        }),
      );
    }

    node.ports.forEach((port) => this.renderPort(node, port));

    group.on('mouseenter', () => this.setHovered(node.id));
    group.on('mouseleave', () => this.setHovered(null));

    group.on('pointerdown', (e) => {
      e.cancelBubble = true;
      if (!this.state.selectedNodeIds().has(node.id) || e.evt.shiftKey) {
        this.state.selectNode(node.id, e.evt.shiftKey);
      }
    });

    group.on('dblclick dbltap', () => this.nodeActivated.emit(node.id));

    group.on('dragstart', () => {
      this.state.commit();
      this.dragOrigin.clear();
      const moving = this.state.selectedNodeIds().has(node.id)
        ? this.selectionWithDescendants()
        : new Set(this.state.descendantIds(node.id));
      moving.forEach((id) => {
        const g = this.nodeGroup(id);
        if (g) this.dragOrigin.set(id, g.position());
      });
      this.dragOrigin.set(node.id, group.position());
    });

    group.on('dragmove', () => {
      const pos = { x: snap(group.x()), y: snap(group.y()) };
      group.position(pos);
      const origin = this.dragOrigin.get(node.id) as { x: number; y: number };
      const dx = pos.x - origin.x;
      const dy = pos.y - origin.y;
      const moves = [...this.dragOrigin].map(([id, o]) => ({
        id,
        x: o.x + dx,
        y: o.y + dy,
      }));
      moves.forEach((m) => {
        if (m.id !== node.id) this.nodeGroup(m.id)?.position(m);
      });
      this.state.moveNodes(moves);
      moves.forEach((m) => this.syncNodeVisuals(m.id));
    });

    group.on('dragend', () => this.reparent([...this.dragOrigin.keys()]));

    (def.container ? this.containersLayer : this.nodesLayer).add(group);
  }

  private renderPort(node: CanvasNode, port: Port): void {
    const pos = this.portPosition(port, node);
    const circle = new Konva.Circle({
      x: pos.x,
      y: pos.y,
      radius: 5,
      fill: '#3b82f6',
      stroke: 'white',
      strokeWidth: 2,
      id: portId(node.id, port.id),
      name: 'port',
      hitStrokeWidth: 8,
      visible: false,
    });
    circle.on('mouseenter', () => {
      this.setHovered(node.id);
      circle.radius(8);
      this.stage?.container().style.setProperty('cursor', 'crosshair');
    });
    circle.on('mouseleave', () => {
      circle.radius(5);
      this.stage?.container().style.removeProperty('cursor');
      this.setHovered(null);
    });
    circle.on('pointerdown', (e) => {
      e.cancelBubble = true;
      this.startEdgeDraw(node.id, port.id, circle);
    });
    this.portsLayer.add(circle);
  }

  private renderEdge(edge: CanvasEdge): void {
    const points = this.edgePoints(edge);
    if (!points) return;
    const style = EDGE_STYLE[edge.kind];
    const arrow = new Konva.Arrow({
      id: edge.id,
      name: 'edge',
      points,
      stroke: style.stroke,
      fill: style.stroke,
      strokeWidth: 2,
      dash: style.dash,
      lineJoin: 'round',
      pointerLength: style.arrow ? 10 : 0,
      pointerWidth: style.arrow ? 8 : 0,
      hitStrokeWidth: 12,
    });
    arrow.on('pointerdown', (e) => {
      e.cancelBubble = true;
      this.state.selectEdge(edge.id, e.evt.shiftKey);
    });
    this.edgesLayer.add(arrow);

    const text =
      edge.label ??
      (edge.kind === 'depends-on' ? '' : EDGE_KIND_LABELS[edge.kind]);
    const anchor = labelAnchor(points);
    if (text && anchor) {
      const label = new Konva.Label({
        id: `${edge.id}-label`,
        name: 'edge-label',
        listening: false,
        ...anchor,
      });
      label.add(
        new Konva.Tag({ fill: 'white', cornerRadius: 3, opacity: 0.9 }),
        new Konva.Text({
          text,
          fontSize: 9,
          fontFamily: FONT,
          fill: style.stroke,
          padding: 3,
        }),
      );
      label.offsetX(label.width() / 2);
      label.offsetY(label.height() / 2);
      this.edgesLayer.add(label);
    }
  }

  private drawGrid(): void {
    if (!this.stage) return;
    this.gridLayer.destroyChildren();
    const zoom = this.state.zoom();
    const topLeft = this.toCanvasPoint({ x: 0, y: 0 });
    const bottomRight = this.toCanvasPoint({
      x: this.stage.width(),
      y: this.stage.height(),
    });
    const startX = Math.floor(topLeft.x / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(topLeft.y / GRID_SIZE) * GRID_SIZE;
    const lineProps = { stroke: '#e5e7eb', strokeWidth: 1 / zoom };

    for (let x = startX; x < bottomRight.x; x += GRID_SIZE) {
      this.gridLayer.add(
        new Konva.Line({
          points: [x, topLeft.y, x, bottomRight.y],
          ...lineProps,
        }),
      );
    }
    for (let y = startY; y < bottomRight.y; y += GRID_SIZE) {
      this.gridLayer.add(
        new Konva.Line({
          points: [topLeft.x, y, bottomRight.x, y],
          ...lineProps,
        }),
      );
    }
  }

  private updateTransform(): void {
    const x = this.state.panX();
    const y = this.state.panY();
    const scale = this.state.zoom();
    [
      this.gridLayer,
      this.containersLayer,
      this.edgesLayer,
      this.nodesLayer,
      this.portsLayer,
      this.overlayLayer,
    ].forEach((layer) =>
      layer.setAttrs({ x, y, scaleX: scale, scaleY: scale }),
    );
  }

  /** Re-applies selection highlights, port visibility and the resize transformer. */
  private refreshSelection(): void {
    const nodeIds = this.state.selectedNodeIds();
    const edgeIds = this.state.selectedEdgeIds();

    this.allNodeGroups().forEach((group) => {
      const selected = nodeIds.has(group.id());
      group.findOne<Konva.Rect>('.body')?.setAttrs({
        stroke: selected ? '#3b82f6' : '#d1d5db',
        strokeWidth: selected ? 2 : 1,
      });
    });

    this.edgesLayer.find<Konva.Arrow>('.edge').forEach((arrow) => {
      const edge = this.state.edges().find((e) => e.id === arrow.id());
      const selected = edgeIds.has(arrow.id());
      const stroke = selected
        ? '#3b82f6'
        : EDGE_STYLE[edge?.kind ?? 'depends-on'].stroke;
      arrow.stroke(stroke);
      arrow.fill(stroke);
      arrow.strokeWidth(selected ? 3 : 2);
    });

    const single = nodeIds.size === 1 ? [...nodeIds][0] : null;
    const group = single ? this.nodeGroup(single) : null;
    const body = group?.hasName('container')
      ? group.findOne<Konva.Rect>('.body')
      : undefined;
    this.transformer.nodes(body ? [body] : []);
    this.updatePortVisibility();
  }

  private setHovered(nodeId: string | null): void {
    if (this.hoveredNodeId === nodeId) return;
    this.hoveredNodeId = nodeId;
    this.updatePortVisibility();
  }

  /** Ports show for hovered/selected nodes, and everywhere while drawing an edge. */
  private updatePortVisibility(): void {
    const selected = this.state.selectedNodeIds();
    this.portsLayer.find<Konva.Circle>('.port').forEach((circle) => {
      const [nodeId] = parsePortId(circle.id());
      circle.visible(
        this.drawingFrom !== null ||
          nodeId === this.hoveredNodeId ||
          selected.has(nodeId),
      );
    });
  }

  // --- Interaction ---------------------------------------------------------

  private setupStageEvents(): void {
    const stage = this.stage as Konva.Stage;

    stage.on('pointerdown', (e) => {
      if (e.target !== stage) return;
      this.state.clearSelection();
      this.pointerStart = stage.getPointerPosition() ?? { x: 0, y: 0 };
      this.pointerMode = e.evt.shiftKey ? 'select' : 'pan';
      if (this.pointerMode === 'select') {
        const p = this.toCanvasPoint(this.pointerStart);
        this.selectionRect = new Konva.Rect({
          x: p.x,
          y: p.y,
          fill: 'rgba(59, 130, 246, 0.1)',
          stroke: '#3b82f6',
          strokeWidth: 1 / this.state.zoom(),
        });
        this.overlayLayer.add(this.selectionRect);
      } else {
        stage.container().style.setProperty('cursor', 'grabbing');
      }
    });

    stage.on('pointermove', () => {
      const pos = stage.getPointerPosition() ?? { x: 0, y: 0 };
      if (this.pointerMode === 'pan') {
        this.state.setPan(
          this.state.panX() + pos.x - this.pointerStart.x,
          this.state.panY() + pos.y - this.pointerStart.y,
        );
        this.pointerStart = pos;
      } else if (this.pointerMode === 'select' && this.selectionRect) {
        const a = this.toCanvasPoint(this.pointerStart);
        const b = this.toCanvasPoint(pos);
        this.selectionRect.setAttrs({
          x: Math.min(a.x, b.x),
          y: Math.min(a.y, b.y),
          width: Math.abs(b.x - a.x),
          height: Math.abs(b.y - a.y),
        });
      }
    });

    stage.on('pointerup', () => {
      if (this.pointerMode === 'pan') {
        stage.container().style.removeProperty('cursor');
      } else if (this.pointerMode === 'select' && this.selectionRect) {
        const box = this.selectionRect.getSelfRect();
        box.x = this.selectionRect.x();
        box.y = this.selectionRect.y();
        this.selectionRect.destroy();
        this.selectionRect = null;
        const hit = this.state
          .nodes()
          .filter((n) => Konva.Util.haveIntersection(box, this.nodeRect(n)))
          .map((n) => n.id);
        this.state.selectNodes(hit);
      }
      this.pointerMode = 'none';
    });

    stage.on('wheel', (e) => {
      e.evt.preventDefault();
      const oldScale = this.state.zoom();
      const pointer = stage.getPointerPosition() ?? { x: 0, y: 0 };
      const anchor = this.toCanvasPoint(pointer);
      this.state.setZoom(e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1);
      const scale = this.state.zoom();
      this.state.setPan(
        pointer.x - anchor.x * scale,
        pointer.y - anchor.y * scale,
      );
    });
  }

  private setupTransformer(): void {
    this.transformer.on('transformstart', () => this.state.commit());
    this.transformer.on('transform', () => {
      const body = this.transformer.nodes()[0] as Konva.Rect | undefined;
      if (body) this.applyBodyScale(body);
    });
    this.transformer.on('transformend', () => {
      const body = this.transformer.nodes()[0] as Konva.Rect | undefined;
      const group = body?.getParent() as Konva.Group | undefined;
      if (!body || !group) return;
      const x = snap(group.x());
      const y = snap(group.y());
      const width = Math.max(MIN_CONTAINER_SIZE, snap(body.width()));
      const height = Math.max(MIN_CONTAINER_SIZE, snap(body.height()));
      // transformstart already committed; this is the same undo step.
      this.state.updateNode(group.id(), { x, y, width, height }, false);
      this.adoptNodesInside(group.id());
    });
  }

  /** Bakes transformer scale into the body and moves the group with it. */
  private applyBodyScale(body: Konva.Rect): void {
    const group = body.getParent() as Konva.Group;
    const width = body.width() * body.scaleX();
    const height = body.height() * body.scaleY();
    body.scale({ x: 1, y: 1 });
    group.move({ x: body.x(), y: body.y() });
    body.position({ x: 0, y: 0 });
    body.size({ width, height });
    group.findOne<Konva.Rect>('.header')?.width(width);
    group.find<Konva.Text>('.label, .type').forEach((t) => t.width(width));
    group.findOne<Konva.Circle>('.issue')?.x(width);
    group.findOne<Konva.Text>('.issue-mark')?.x(width - 7);
    this.state.moveNodes([{ id: group.id(), x: group.x(), y: group.y() }]);
    const node = this.state.node(group.id());
    if (node) {
      const resized = { ...node, width, height };
      this.positionPorts(resized);
      this.updateEdgesForNode(node.id, resized);
    }
  }

  private nudgeSelection(dx: number, dy: number, record: boolean): void {
    const moved = this.selectionWithDescendants();
    if (moved.size === 0) return;
    if (record) this.state.commit();
    this.state.moveNodes(
      [...moved].flatMap((id) => {
        const n = this.state.node(id);
        return n ? [{ id, x: n.x + dx, y: n.y + dy }] : [];
      }),
    );
    moved.forEach((id) => {
      const n = this.state.node(id);
      if (n) {
        this.nodeGroup(id)?.position({ x: n.x, y: n.y });
        this.syncNodeVisuals(id);
      }
    });
    this.reparent([...moved]);
  }

  /**
   * Re-derives the container of every moved node whose parent didn't move
   * with it. Doesn't record history: the gesture already committed.
   */
  private reparent(movedIds: string[]): void {
    const moved = new Set(movedIds);
    const patches = movedIds.flatMap((id) => {
      const node = this.state.node(id);
      if (!node || (node.parentId && moved.has(node.parentId))) return [];
      const parentId = this.findContainerFor(node);
      return parentId === node.parentId ? [] : [{ id, parentId }];
    });
    this.state.updateNodes(patches, false);
  }

  /** Makes a container own the nodes now drawn inside it (after drop/resize). */
  private adoptNodesInside(containerId: string): void {
    const excluded = new Set(this.state.descendantIds(containerId));
    const patches = this.state
      .nodes()
      .filter((n) => !excluded.has(n.id))
      .flatMap((n) => {
        const parentId = this.findContainerFor(n);
        return parentId === n.parentId ? [] : [{ id: n.id, parentId }];
      });
    this.state.updateNodes(patches, false);
  }

  private startEdgeDraw(
    sourceNodeId: string,
    sourcePortId: string,
    circle: Konva.Circle,
  ): void {
    const stage = this.stage as Konva.Stage;
    const from = { x: circle.x(), y: circle.y() };
    this.tempLine = new Konva.Line({
      points: [from.x, from.y, from.x, from.y],
      stroke: '#3b82f6',
      strokeWidth: 2 / this.state.zoom(),
      dash: [6, 3],
      listening: false,
    });
    this.overlayLayer.add(this.tempLine);
    this.drawingFrom = sourceNodeId;
    this.updatePortVisibility();

    const onMove = () => {
      const p = this.toCanvasPoint(stage.getPointerPosition() ?? from);
      this.tempLine?.points([from.x, from.y, p.x, p.y]);
    };

    const cleanup = () => {
      stage.off('pointermove', onMove);
      stage.off('pointerup', onUp);
      this.tempLine?.destroy();
      this.tempLine = null;
      this.drawingFrom = null;
      this.cancelEdgeDraw = null;
      this.updatePortVisibility();
    };
    this.cancelEdgeDraw = cleanup;

    const onUp = (evt: Konva.KonvaEventObject<PointerEvent>) => {
      cleanup();

      const target = evt.target;
      if (!target.hasName('port')) return;
      const [targetNodeId, targetPortId] = parsePortId(target.id());
      if (targetNodeId === sourceNodeId) return;

      const source = this.state.node(sourceNodeId);
      const targetNode = this.state.node(targetNodeId);
      if (!source || !targetNode) return;

      const resolved = resolveEdge(source.type, targetNode.type);
      if (!resolved) {
        this.flashRejected(target as Konva.Circle);
        return;
      }
      const edge: CanvasEdge = resolved.flipped
        ? {
            id: this.state.createEdgeId(),
            kind: resolved.kind,
            sourceNodeId: targetNodeId,
            sourcePortId: targetPortId,
            targetNodeId: sourceNodeId,
            targetPortId: sourcePortId,
          }
        : {
            id: this.state.createEdgeId(),
            kind: resolved.kind,
            sourceNodeId,
            sourcePortId,
            targetNodeId,
            targetPortId,
          };
      this.state.addEdge(edge);
      this.state.selectEdge(edge.id);
    };

    stage.on('pointermove', onMove);
    stage.on('pointerup', onUp);
  }

  private flashRejected(circle: Konva.Circle): void {
    circle.fill('#ef4444');
    new Konva.Tween({ node: circle, duration: 0.6, fill: '#3b82f6' }).play();
  }

  // --- Geometry helpers ----------------------------------------------------

  private syncNodeVisuals(nodeId: string): void {
    const node = this.state.node(nodeId);
    if (!node) return;
    this.positionPorts(node);
    this.updateEdgesForNode(nodeId, node);
  }

  private positionPorts(node: CanvasNode): void {
    node.ports.forEach((port) => {
      const pos = this.portPosition(port, node);
      this.portsLayer
        .findOne<Konva.Circle>(`#${portId(node.id, port.id)}`)
        ?.position(pos);
    });
  }

  /** `override` supplies in-progress geometry (e.g. mid-resize) for one node. */
  private updateEdgesForNode(nodeId: string, override?: CanvasNode): void {
    this.state
      .edges()
      .filter((e) => e.sourceNodeId === nodeId || e.targetNodeId === nodeId)
      .forEach((edge) => {
        const points = this.edgePoints(edge, override);
        if (!points) return;
        this.edgesLayer.findOne<Konva.Arrow>(`#${edge.id}`)?.points(points);
        const label = this.edgesLayer.findOne<Konva.Label>(`#${edge.id}-label`);
        const anchor = labelAnchor(points);
        label?.visible(anchor !== null);
        if (anchor) label?.position(anchor);
      });
  }

  private edgePoints(edge: CanvasEdge, override?: CanvasNode): number[] | null {
    const pick = (id: string) =>
      override?.id === id ? override : this.state.node(id);
    const source = pick(edge.sourceNodeId);
    const target = pick(edge.targetNodeId);
    const sourcePort = source?.ports.find((p) => p.id === edge.sourcePortId);
    const targetPort = target?.ports.find((p) => p.id === edge.targetPortId);
    if (!source || !target || !sourcePort || !targetPort) return null;
    return routeEdge(
      { ...this.portPosition(sourcePort, source), side: sourcePort.side },
      { ...this.portPosition(targetPort, target), side: targetPort.side },
    );
  }

  /** Absolute canvas position of a port. */
  private portPosition(port: Port, node: CanvasNode): { x: number; y: number } {
    switch (port.side) {
      case 'top':
        return { x: node.x + node.width * port.offset, y: node.y };
      case 'bottom':
        return {
          x: node.x + node.width * port.offset,
          y: node.y + node.height,
        };
      case 'left':
        return { x: node.x, y: node.y + node.height * port.offset };
      case 'right':
        return {
          x: node.x + node.width,
          y: node.y + node.height * port.offset,
        };
    }
  }

  private nodeRect(n: CanvasNode) {
    return { x: n.x, y: n.y, width: n.width, height: n.height };
  }

  private selectionWithDescendants(): Set<string> {
    return new Set(
      [...this.state.selectedNodeIds()].flatMap((id) =>
        this.state.descendantIds(id),
      ),
    );
  }

  /** Smallest container whose bounds hold the node's centre, excluding itself. */
  private findContainerFor(node: CanvasNode): string | undefined {
    const excluded = new Set(this.state.descendantIds(node.id));
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    return this.state
      .nodes()
      .filter(
        (n) =>
          !excluded.has(n.id) &&
          AWS_SERVICE_MAP.get(n.type)?.container &&
          cx >= n.x &&
          cx <= n.x + n.width &&
          cy >= n.y &&
          cy <= n.y + n.height,
      )
      .sort((a, b) => a.width * a.height - b.width * b.height)[0]?.id;
  }

  private nodeGroup(id: string): Konva.Group | undefined {
    return (
      this.nodesLayer.findOne<Konva.Group>(`#${id}`) ??
      this.containersLayer.findOne<Konva.Group>(`#${id}`)
    );
  }

  private allNodeGroups(): Konva.Group[] {
    return [
      ...this.containersLayer.find<Konva.Group>('.node'),
      ...this.nodesLayer.find<Konva.Group>('.node'),
    ];
  }

  private toCanvasPoint(p: { x: number; y: number }): { x: number; y: number } {
    const zoom = this.state.zoom();
    return {
      x: (p.x - this.state.panX()) / zoom,
      y: (p.y - this.state.panY()) / zoom,
    };
  }
}

function snap(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function portId(nodeId: string, port: string): string {
  return `${nodeId}-port-${port}`;
}

function parsePortId(id: string): [string, string] {
  const [nodeId, port] = id.split('-port-');
  return [nodeId, port];
}

const MIN_LABEL_SEGMENT = 60;

/** Midpoint of the longest straight run, where a label won't sit on a node. */
function labelAnchor(points: number[]): { x: number; y: number } | null {
  let best: { len: number; i: number } | null = null;
  for (let i = 0; i + 3 < points.length; i += 2) {
    const len = Math.hypot(
      points[i + 2] - points[i],
      points[i + 3] - points[i + 1],
    );
    if (!best || len > best.len) best = { len, i };
  }
  if (!best || best.len < MIN_LABEL_SEGMENT) return null;
  const { i } = best;
  return {
    x: (points[i] + points[i + 2]) / 2,
    y: (points[i + 1] + points[i + 3]) / 2,
  };
}
