import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  HostListener,
  effect,
  output,
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
} from '@infra-builder/state';
import { AWS_SERVICE_MAP, resolveEdge } from '@infra-builder/aws-icons';

const GRID_SIZE = 20;
const HEADER_HEIGHT = 28;
const MIN_CONTAINER_SIZE = 120;
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

  private state = inject(CanvasStateService);
  private stage?: Konva.Stage;
  private gridLayer!: Konva.Layer;
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

  constructor() {
    effect(() => {
      this.state.version();
      if (this.stage) this.renderAll();
    });
  }

  ngAfterViewInit(): void {
    this.initKonva();
    this.renderAll();
  }

  ngOnDestroy(): void {
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
    this.edgesLayer = new Konva.Layer();
    this.nodesLayer = new Konva.Layer();
    this.portsLayer = new Konva.Layer();
    this.overlayLayer = new Konva.Layer();
    this.transformer = new Konva.Transformer({
      rotateEnabled: false,
      enabledAnchors: [
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
        'middle-right',
        'bottom-center',
      ],
      anchorSize: 8,
      keepRatio: false,
      borderStroke: '#3b82f6',
      anchorStroke: '#3b82f6',
      ignoreStroke: true,
    });
    this.overlayLayer.add(this.transformer);

    this.stage.add(
      this.gridLayer,
      this.edgesLayer,
      this.nodesLayer,
      this.portsLayer,
      this.overlayLayer,
    );

    this.setupStageEvents();
    this.setupTransformer();
  }

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
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        this.state.redo();
      } else {
        this.state.undo();
      }
    } else if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      this.state.redo();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.deleteSelection();
    } else if (e.key === 'Escape') {
      this.state.clearSelection();
      this.refreshSelection();
    } else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const step = e.shiftKey ? GRID_SIZE * 5 : GRID_SIZE;
      const dx =
        e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      this.nudgeSelection(dx, dy);
    }
  }

  // --- Public actions ------------------------------------------------------

  deleteSelection(): void {
    this.state.removeEdges([...this.state.selectedEdgeIds()]);
    this.state.removeNodes([...this.state.selectedNodeIds()]);
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
      this.updateTransform();
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
    this.updateTransform();
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
    this.state.selectNode(node.id);
  }

  // --- Rendering -----------------------------------------------------------

  private renderAll(): void {
    this.transformer.nodes([]);
    this.nodesLayer.destroyChildren();
    this.portsLayer.destroyChildren();
    this.edgesLayer.destroyChildren();

    const nodes = this.state.nodes();
    const depth = (n: CanvasNode): number =>
      n.parentId ? 1 + depth(this.state.node(n.parentId) ?? n) : 0;
    [...nodes]
      .sort((a, b) => depth(a) - depth(b))
      .forEach((node) => {
        const def = AWS_SERVICE_MAP.get(node.type);
        if (def) this.renderNode(node, def);
      });
    this.state.edges().forEach((edge) => this.renderEdge(edge));

    this.updateTransform();
    this.drawGrid();
    this.refreshSelection();
  }

  private renderNode(node: CanvasNode, def: AwsServiceDefinition): void {
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
      new Konva.Text({
        name: 'type',
        text: def.label.toUpperCase(),
        fontSize: 10,
        fontFamily: FONT,
        fill: '#6b7280',
        y: HEADER_HEIGHT + 8,
        width: node.width,
        align: def.container ? 'right' : 'center',
        padding: def.container ? 6 : 0,
      }),
    );

    node.ports.forEach((port) => this.renderPort(node, port));

    group.on('pointerdown', (e) => {
      e.cancelBubble = true;
      if (!this.state.selectedNodeIds().has(node.id) || e.evt.shiftKey) {
        this.state.selectNode(node.id, e.evt.shiftKey);
      }
      this.refreshSelection();
    });

    group.on('dblclick dbltap', () => this.nodeActivated.emit(node.id));

    group.on('dragstart', () => {
      this.state.commit();
      this.dragOrigin.clear();
      this.dragOrigin.set(node.id, group.position());
      this.state.descendantIds(node.id).forEach((id) => {
        const g = this.nodeGroup(id);
        if (g) this.dragOrigin.set(id, g.position());
      });
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

    group.on('dragend', () => {
      const current = this.state.node(node.id);
      if (!current) return;
      const parentId = this.findContainerFor(current);
      if (parentId !== current.parentId) {
        this.state.updateNode(node.id, { parentId });
      } else {
        this.refreshSelection();
      }
    });

    this.nodesLayer.add(group);
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
      hitStrokeWidth: 10,
    });
    circle.on('mouseenter', () => {
      circle.radius(8);
      this.stage?.container().style.setProperty('cursor', 'crosshair');
    });
    circle.on('mouseleave', () => {
      circle.radius(5);
      this.stage?.container().style.removeProperty('cursor');
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
      pointerLength: style.arrow ? 10 : 0,
      pointerWidth: style.arrow ? 8 : 0,
      hitStrokeWidth: 12,
    });
    arrow.on('pointerdown', (e) => {
      e.cancelBubble = true;
      this.state.selectEdge(edge.id, e.evt.shiftKey);
      this.refreshSelection();
    });
    this.edgesLayer.add(arrow);
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
      this.edgesLayer,
      this.nodesLayer,
      this.portsLayer,
      this.overlayLayer,
    ].forEach((layer) =>
      layer.setAttrs({ x, y, scaleX: scale, scaleY: scale }),
    );
  }

  /** Re-applies selection highlights and the resize transformer. */
  private refreshSelection(): void {
    const nodeIds = this.state.selectedNodeIds();
    const edgeIds = this.state.selectedEdgeIds();

    this.nodesLayer.find<Konva.Group>('.node').forEach((group) => {
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
    this.transformer.nodes(group?.hasName('container') ? [group] : []);
  }

  // --- Interaction ---------------------------------------------------------

  private setupStageEvents(): void {
    const stage = this.stage as Konva.Stage;

    stage.on('pointerdown', (e) => {
      if (e.target !== stage) return;
      this.state.clearSelection();
      this.refreshSelection();
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
        this.updateTransform();
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
        this.drawGrid();
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
        this.refreshSelection();
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
      this.updateTransform();
      this.drawGrid();
    });
  }

  private setupTransformer(): void {
    this.transformer.on('transformstart', () => this.state.commit());
    this.transformer.on('transform', () => {
      const group = this.transformer.nodes()[0] as Konva.Group | undefined;
      if (group) this.applyGroupScale(group);
    });
    this.transformer.on('transformend', () => {
      const group = this.transformer.nodes()[0] as Konva.Group | undefined;
      if (!group) return;
      const body = group.findOne<Konva.Rect>('.body') as Konva.Rect;
      const x = snap(group.x());
      const y = snap(group.y());
      const width = Math.max(MIN_CONTAINER_SIZE, snap(body.width()));
      const height = Math.max(MIN_CONTAINER_SIZE, snap(body.height()));
      this.state.moveNodes([{ id: group.id(), x, y }]);
      this.state.updateNode(group.id(), { width, height });
    });
  }

  /** Bakes transformer scale into the group's shapes so strokes stay crisp. */
  private applyGroupScale(group: Konva.Group): void {
    const body = group.findOne<Konva.Rect>('.body') as Konva.Rect;
    const width = body.width() * group.scaleX();
    const height = body.height() * group.scaleY();
    group.scale({ x: 1, y: 1 });
    body.size({ width, height });
    group.findOne<Konva.Rect>('.header')?.width(width);
    group.find<Konva.Text>('.label, .type').forEach((t) => t.width(width));
    this.state.moveNodes([{ id: group.id(), x: group.x(), y: group.y() }]);
    const node = this.state.node(group.id());
    if (node) {
      this.positionPorts({ ...node, width, height });
      this.updateEdgesForNode(node.id);
    }
  }

  private nudgeSelection(dx: number, dy: number): void {
    const ids = [...this.state.selectedNodeIds()];
    if (ids.length === 0) return;
    this.state.commit();
    const moved = new Set(ids.flatMap((id) => this.state.descendantIds(id)));
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
    });
    this.overlayLayer.add(this.tempLine);

    const onMove = () => {
      const p = this.toCanvasPoint(stage.getPointerPosition() ?? from);
      this.tempLine?.points([from.x, from.y, p.x, p.y]);
    };

    const onUp = (evt: Konva.KonvaEventObject<PointerEvent>) => {
      stage.off('pointermove', onMove);
      stage.off('pointerup', onUp);
      this.tempLine?.destroy();
      this.tempLine = null;

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
    this.updateEdgesForNode(nodeId);
  }

  private positionPorts(node: CanvasNode): void {
    node.ports.forEach((port) => {
      const pos = this.portPosition(port, node);
      this.portsLayer
        .findOne<Konva.Circle>(`#${portId(node.id, port.id)}`)
        ?.position(pos);
    });
  }

  private updateEdgesForNode(nodeId: string): void {
    this.state
      .edges()
      .filter((e) => e.sourceNodeId === nodeId || e.targetNodeId === nodeId)
      .forEach((edge) => {
        const points = this.edgePoints(edge);
        if (points)
          this.edgesLayer.findOne<Konva.Arrow>(`#${edge.id}`)?.points(points);
      });
  }

  private edgePoints(edge: CanvasEdge): number[] | null {
    const source = this.state.node(edge.sourceNodeId);
    const target = this.state.node(edge.targetNodeId);
    const sourcePort = source?.ports.find((p) => p.id === edge.sourcePortId);
    const targetPort = target?.ports.find((p) => p.id === edge.targetPortId);
    if (!source || !target || !sourcePort || !targetPort) return null;
    const a = this.portPosition(sourcePort, source);
    const b = this.portPosition(targetPort, target);
    return [a.x, a.y, b.x, b.y];
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
    return this.nodesLayer.findOne<Konva.Group>(`#${id}`);
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
