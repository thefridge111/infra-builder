import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  HostListener,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import Konva from 'konva';
import { CanvasStateService } from '@infra-builder/state';
import { AwsServiceDefinition, CanvasNode, Port } from '@infra-builder/state';
import { AWS_SERVICES } from '@infra-builder/aws-icons';

@Component({
  selector: 'lib-canvas',
  imports: [CommonModule],
  templateUrl: './canvas.html',
  styleUrl: './canvas.scss',
})
export class Canvas implements AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;

  private state = inject(CanvasStateService);
  private stage!: Konva.Stage;
  private layer!: Konva.Layer;
  private gridLayer!: Konva.Layer;
  private nodesLayer!: Konva.Layer;
  private edgesLayer!: Konva.Layer;
  private portsLayer!: Konva.Layer;
  private tempLine: Konva.Line | null = null;

  private readonly GRID_SIZE = 20;
  private isPanning = false;
  private lastPointerPosition = { x: 0, y: 0 };
  private dragServiceDef: AwsServiceDefinition | null = null;

  ngAfterViewInit(): void {
    this.initKonva();
    this.setupEventListeners();
    this.setupKeyboardHandlers();
    this.renderExistingState();
    this.watchStateChanges();
  }

  private renderExistingState(): void {
    this.state.nodes().forEach((node) => {
      const serviceDef = AWS_SERVICES.find((s) => s.type === node.type);
      if (serviceDef) {
        this.renderNode(node, serviceDef);
      }
    });
    this.state.edges().forEach((edge) => {
      this.renderEdge(edge);
    });
    this.updateTransform();
  }

  private watchStateChanges(): void {
    effect(() => {
      this.state.nodes();
      this.state.edges();
      this.updateTransform();
    });
  }

  ngOnDestroy(): void {
    this.stage?.destroy();
  }

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
    this.layer = new Konva.Layer();

    this.stage.add(this.gridLayer);
    this.stage.add(this.edgesLayer);
    this.stage.add(this.nodesLayer);
    this.stage.add(this.portsLayer);
    this.stage.add(this.layer);

    this.drawGrid();
    this.setupStageEvents();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
  }

  private setupKeyboardHandlers(): void {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = document.activeElement;
        if (
          active &&
          (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')
        ) {
          return;
        }
        e.preventDefault();
        this.deleteSelection();
      }
    };
    window.addEventListener('keydown', handler);
  }

  deleteSelection(): void {
    const nodeIds = [...this.state.selectedNodeIds()];
    const edgeIds = [...this.state.selectedEdgeIds()];

    nodeIds.forEach((id) => {
      const group = this.nodesLayer.findOne<Konva.Group>(`#${id}`);
      group?.destroy();
      this.state.removeNode(id);
    });

    edgeIds.forEach((id) => {
      const line = this.edgesLayer.findOne<Konva.Line>(`#${id}`);
      line?.destroy();
      this.state.removeEdge(id);
    });

    this.nodesLayer.batchDraw();
    this.edgesLayer.batchDraw();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.stage && this.canvasContainer) {
      const container = this.canvasContainer.nativeElement;
      this.stage.width(container.clientWidth);
      this.stage.height(container.clientHeight);
      this.drawGrid();
    }
  }

  private drawGrid(): void {
    this.gridLayer.destroyChildren();

    const width = this.stage.width() * 3;
    const height = this.stage.height() * 3;
    const gridSize = this.GRID_SIZE * this.state.zoom();

    for (let x = -width; x < width; x += gridSize) {
      this.gridLayer.add(
        new Konva.Line({
          points: [x, -height, x, height],
          stroke: '#e5e7eb',
          strokeWidth: 1 / this.state.zoom(),
        }),
      );
    }

    for (let y = -height; y < height; y += gridSize) {
      this.gridLayer.add(
        new Konva.Line({
          points: [-width, y, width, y],
          stroke: '#e5e7eb',
          strokeWidth: 1 / this.state.zoom(),
        }),
      );
    }

    this.gridLayer.batchDraw();
  }

  private setupStageEvents(): void {
    this.stage.on('pointerdown', (e) => {
      if (e.target === this.stage || e.target.getParent() === this.gridLayer) {
        this.state.clearSelection();
        this.updateAllNodeHighlights();
        this.isPanning = e.evt.button === 1 || e.evt.shiftKey;
        this.lastPointerPosition = this.stage.getPointerPosition() || {
          x: 0,
          y: 0,
        };
      }
    });

    this.stage.on('pointermove', () => {
      if (this.isPanning) {
        const pos = this.stage.getPointerPosition() || { x: 0, y: 0 };
        const dx = pos.x - this.lastPointerPosition.x;
        const dy = pos.y - this.lastPointerPosition.y;
        this.state.setPan(this.state.panX() + dx, this.state.panY() + dy);
        this.lastPointerPosition = pos;
        this.updateTransform();
      }
    });

    this.stage.on('pointerup', () => {
      this.isPanning = false;
    });

    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();
      const scaleBy = 1.1;
      const oldScale = this.state.zoom();
      const pointer = this.stage.getPointerPosition() || { x: 0, y: 0 };

      const mousePointTo = {
        x: (pointer.x - this.state.panX()) / oldScale,
        y: (pointer.y - this.state.panY()) / oldScale,
      };

      const direction = e.evt.deltaY < 0 ? 1 : -1;
      const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
      this.state.setZoom(newScale);

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };

      this.state.setPan(newPos.x, newPos.y);
      this.updateTransform();
      this.drawGrid();
    });
  }

  private updateTransform(): void {
    const x = this.state.panX();
    const y = this.state.panY();
    const scale = this.state.zoom();

    [this.edgesLayer, this.nodesLayer, this.portsLayer, this.gridLayer].forEach(
      (layer) => {
        layer.x(x);
        layer.y(y);
        layer.scaleX(scale);
        layer.scaleY(scale);
      },
    );
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const serviceType = event.dataTransfer?.getData('application/aws-service');
    if (!serviceType) return;

    const serviceDef = AWS_SERVICES.find((s) => s.type === serviceType);
    if (!serviceDef) return;

    const stageRect = this.stage.container().getBoundingClientRect();
    const x =
      (event.clientX - stageRect.left - this.state.panX()) / this.state.zoom();
    const y =
      (event.clientY - stageRect.top - this.state.panY()) / this.state.zoom();

    const snappedX = Math.round(x / this.GRID_SIZE) * this.GRID_SIZE;
    const snappedY = Math.round(y / this.GRID_SIZE) * this.GRID_SIZE;

    const node: CanvasNode = {
      id: this.state.createNodeId(),
      type: serviceDef.type,
      label: serviceDef.label,
      x: snappedX,
      y: snappedY,
      width: serviceDef.defaultWidth,
      height: serviceDef.defaultHeight,
      ports: serviceDef.defaultPorts.map((p) => ({ ...p })),
      properties: {},
    };

    this.state.addNode(node);
    this.renderNode(node, serviceDef);
  }

  private renderNode(node: CanvasNode, serviceDef: AwsServiceDefinition): void {
    const group = new Konva.Group({
      x: node.x,
      y: node.y,
      draggable: true,
      id: node.id,
    });

    // Shadow
    group.add(
      new Konva.Rect({
        width: node.width,
        height: node.height,
        fill: 'white',
        stroke: '#d1d5db',
        strokeWidth: 1,
        shadowColor: 'black',
        shadowBlur: 4,
        shadowOffset: { x: 2, y: 2 },
        shadowOpacity: 0.1,
        cornerRadius: 4,
      }),
    );

    // Header
    group.add(
      new Konva.Rect({
        width: node.width,
        height: 28,
        fill: serviceDef.color,
        cornerRadius: [4, 4, 0, 0],
      }),
    );

    // Header text
    group.add(
      new Konva.Text({
        text: serviceDef.label,
        fontSize: 12,
        fontFamily: 'Inter, system-ui, sans-serif',
        fill: 'white',
        padding: 6,
        width: node.width,
        align: 'center',
      }),
    );

    // Body icon placeholder (service type text)
    group.add(
      new Konva.Text({
        text: serviceDef.type.toUpperCase(),
        fontSize: 10,
        fontFamily: 'Inter, system-ui, sans-serif',
        fill: '#6b7280',
        y: 36,
        width: node.width,
        align: 'center',
      }),
    );

    // Ports rendered on separate portsLayer (non-draggable)
    node.ports.forEach((port) => {
      const pos = this.getPortPosition(port, node);
      const portCircle = new Konva.Circle({
        x: node.x + pos.x,
        y: node.y + pos.y,
        radius: 5,
        fill: '#3b82f6',
        stroke: 'white',
        strokeWidth: 2,
        id: `${node.id}-port-${port.id}`,
        name: 'port',
        hitStrokeWidth: 10,
      });

      const portLabel = new Konva.Text({
        text: port.id,
        fontSize: 8,
        fontFamily: 'Inter, system-ui, sans-serif',
        fill: '#3b82f6',
        x: node.x + pos.x,
        y: node.y + pos.y,
        offsetX: port.side === 'left' ? 14 : port.side === 'right' ? -14 : 0,
        offsetY: port.side === 'top' ? 14 : port.side === 'bottom' ? -14 : 4,
        visible: false,
        id: `${node.id}-port-${port.id}-label`,
      });

      portCircle.on('mouseenter', () => {
        portCircle.radius(10);
        portCircle.fill('#2563eb');
        portLabel.visible(true);
        this.portsLayer.batchDraw();
      });

      portCircle.on('mouseleave', () => {
        portCircle.radius(8);
        portCircle.fill('#3b82f6');
        portLabel.visible(false);
        this.portsLayer.batchDraw();
      });

      portCircle.on('pointerdown', (e) => {
        e.cancelBubble = true;
        this.startEdgeDraw(node.id, e.target as Konva.Circle);
      });

      this.portsLayer.add(portCircle);
      this.portsLayer.add(portLabel);
    });

    group.on('pointerdown', (e) => {
      e.cancelBubble = true;
      this.state.selectNode(node.id, e.evt.shiftKey);
      this.updateAllNodeHighlights();
    });

    group.on('dragmove', (e) => {
      const pos = e.target.position();
      const snappedX = Math.round(pos.x / this.GRID_SIZE) * this.GRID_SIZE;
      const snappedY = Math.round(pos.y / this.GRID_SIZE) * this.GRID_SIZE;
      e.target.position({ x: snappedX, y: snappedY });
      this.state.updateNodePosition(node.id, snappedX, snappedY);
      this.updateEdgesForNode(node.id);
      this.updatePortPositions(node.id, snappedX, snappedY);
    });

    this.nodesLayer.add(group);
    this.nodesLayer.batchDraw();
  }

  private getPortPosition(
    port: Port,
    node: CanvasNode,
  ): { x: number; y: number } {
    switch (port.side) {
      case 'top':
        return { x: node.width * port.offset, y: 0 };
      case 'bottom':
        return { x: node.width * port.offset, y: node.height };
      case 'left':
        return { x: 0, y: node.height * port.offset };
      case 'right':
        return { x: node.width, y: node.height * port.offset };
    }
  }

  private highlightNode(group: Konva.Group, selected: boolean): void {
    const rect = group.findOne<Konva.Rect>('Rect');
    if (rect) {
      rect.stroke(selected ? '#3b82f6' : '#d1d5db');
      rect.strokeWidth(selected ? 2 : 1);
    }
    this.nodesLayer.batchDraw();
  }

  private updateAllNodeHighlights(): void {
    const selectedIds = this.state.selectedNodeIds();
    this.nodesLayer.getChildren().forEach((child) => {
      if (child instanceof Konva.Group) {
        this.highlightNode(child, selectedIds.has(child.id()));
      }
    });
  }

  private updatePortPositions(nodeId: string, x: number, y: number): void {
    const node = this.state.nodes().find((n) => n.id === nodeId);
    if (!node) return;

    node.ports.forEach((port) => {
      const pos = this.getPortPosition(port, node);
      const circle = this.portsLayer.findOne<Konva.Circle>(
        `#${nodeId}-port-${port.id}`,
      );
      const label = this.portsLayer.findOne<Konva.Text>(
        `#${nodeId}-port-${port.id}-label`,
      );

      if (circle) {
        circle.x(x + pos.x);
        circle.y(y + pos.y);
      }
      if (label) {
        label.x(x + pos.x);
        label.y(y + pos.y);
      }
    });
    this.portsLayer.batchDraw();
  }

  private startEdgeDraw(nodeId: string, portCircle: Konva.Circle): void {
    const portPos = portCircle.getAbsolutePosition();
    const stagePos = this.stage.getPointerPosition() || { x: 0, y: 0 };

    this.tempLine = new Konva.Line({
      points: [portPos.x, portPos.y, stagePos.x, stagePos.y],
      stroke: '#3b82f6',
      strokeWidth: 2,
      dash: [6, 3],
    });

    this.layer.add(this.tempLine);

    const onPointerMove = () => {
      const pos = this.stage.getPointerPosition() || { x: 0, y: 0 };
      this.tempLine?.points([portPos.x, portPos.y, pos.x, pos.y]);
      this.layer.batchDraw();
    };

    const onPointerUp = (evt: Konva.KonvaEventObject<PointerEvent>) => {
      const target = evt.target as Konva.Circle;
      if (target.name() === 'port') {
        // Port ID format: ${nodeId}-port-${portId}
        const targetPortIdMatch = target.id().match(/^(.+)-port-(.+)$/);
        if (targetPortIdMatch) {
          const targetNodeId = targetPortIdMatch[1];
          const targetPortId = targetPortIdMatch[2];
          const sourcePortId = portCircle.id().split('-port-')[1];

          if (targetNodeId !== nodeId && sourcePortId && targetPortId) {
            const edge = {
              id: this.state.createEdgeId(),
              sourceNodeId: nodeId,
              sourcePortId,
              targetNodeId,
              targetPortId,
            };
            this.state.addEdge(edge);
            this.renderEdge(edge);
          }
        }
      }

      this.tempLine?.destroy();
      this.tempLine = null;
      this.layer.batchDraw();

      this.stage.off('pointermove', onPointerMove);
      this.stage.off('pointerup', onPointerUp);
    };

    this.stage.on('pointermove', onPointerMove);
    this.stage.on('pointerup', onPointerUp);
  }

  private renderEdge(edge: {
    id: string;
    sourceNodeId: string;
    sourcePortId: string;
    targetNodeId: string;
    targetPortId: string;
  }): void {
    const sourceNode = this.state
      .nodes()
      .find((n) => n.id === edge.sourceNodeId);
    const targetNode = this.state
      .nodes()
      .find((n) => n.id === edge.targetNodeId);

    if (!sourceNode || !targetNode) return;

    const sourcePort = sourceNode.ports.find((p) => p.id === edge.sourcePortId);
    const targetPort = targetNode.ports.find((p) => p.id === edge.targetPortId);

    if (!sourcePort || !targetPort) return;

    const sourcePos = this.getPortPosition(sourcePort, sourceNode);
    const targetPos = this.getPortPosition(targetPort, targetNode);

    const line = new Konva.Line({
      points: [
        sourceNode.x + sourcePos.x,
        sourceNode.y + sourcePos.y,
        targetNode.x + targetPos.x,
        targetNode.y + targetPos.y,
      ],
      stroke: '#6b7280',
      strokeWidth: 2,
      id: edge.id,
      hitStrokeWidth: 12,
    });

    line.on('click', (e) => {
      this.state.selectEdge(edge.id, e.evt.shiftKey);
    });

    this.edgesLayer.add(line);
    this.edgesLayer.batchDraw();
  }

  private updateEdgesForNode(nodeId: string): void {
    const edges = this.state
      .edges()
      .filter((e) => e.sourceNodeId === nodeId || e.targetNodeId === nodeId);

    edges.forEach((edge) => {
      const line = this.edgesLayer.findOne<Konva.Line>(`#${edge.id}`);
      if (line) {
        const sourceNode = this.state
          .nodes()
          .find((n) => n.id === edge.sourceNodeId);
        const targetNode = this.state
          .nodes()
          .find((n) => n.id === edge.targetNodeId);

        if (!sourceNode || !targetNode) return;

        const sourcePort = sourceNode.ports.find(
          (p) => p.id === edge.sourcePortId,
        );
        const targetPort = targetNode.ports.find(
          (p) => p.id === edge.targetPortId,
        );

        if (!sourcePort || !targetPort) return;

        const sourcePos = this.getPortPosition(sourcePort, sourceNode);
        const targetPos = this.getPortPosition(targetPort, targetNode);

        line.points([
          sourceNode.x + sourcePos.x,
          sourceNode.y + sourcePos.y,
          targetNode.x + targetPos.x,
          targetNode.y + targetPos.y,
        ]);
      }
    });

    this.edgesLayer.batchDraw();
  }

  getStage(): Konva.Stage {
    return this.stage;
  }
}
