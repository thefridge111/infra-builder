import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CanvasStateService, PropertyField } from '@infra-builder/state';
import {
  AWS_SERVICE_MAP,
  EDGE_KIND_LABELS,
  NODE_PROPERTY_FIELDS,
  TRIGGER_PROPERTY_FIELDS,
  ACCESS_PROPERTY_FIELDS,
  ACCESS_TARGETS,
  matchRule,
  validateDiagram,
} from '@infra-builder/aws-icons';

@Component({
  selector: 'lib-properties',
  templateUrl: './properties.html',
  styleUrl: './properties.scss',
})
export class Properties {
  private labelInput = viewChild<ElementRef<HTMLInputElement>>('labelInput');
  private focusRequests = signal(0);
  private focusHandled = 0;

  private state = inject(CanvasStateService);

  constructor() {
    afterRenderEffect(() => {
      const request = this.focusRequests();
      const input = this.labelInput();
      if (request !== this.focusHandled) {
        this.focusHandled = request;
        input?.nativeElement.select();
      }
    });
  }

  readonly node = computed(() => {
    const selected = this.state.selectedNodes();
    return selected.length === 1 ? selected[0] : null;
  });

  readonly edge = computed(() => {
    const selected = this.state.selectedEdges();
    return selected.length === 1 ? selected[0] : null;
  });

  readonly nodeFields = computed<PropertyField[]>(
    () => NODE_PROPERTY_FIELDS[this.node()?.type ?? 'vpc'] ?? [],
  );

  readonly edgeFields = computed<PropertyField[]>(() => {
    const edge = this.edge();
    if (!edge) return [];
    const source = this.state.node(edge.sourceNodeId);
    const target = this.state.node(edge.targetNodeId);
    if (edge.kind === 'trigger') {
      return (source && TRIGGER_PROPERTY_FIELDS[source.type]) ?? [];
    }
    if (
      edge.kind === 'depends-on' &&
      target &&
      ACCESS_TARGETS.has(target.type)
    ) {
      return ACCESS_PROPERTY_FIELDS;
    }
    return [];
  });

  readonly edgeSummary = computed(() => {
    const edge = this.edge();
    if (!edge) return '';
    const source = this.state.node(edge.sourceNodeId)?.label ?? '?';
    const target = this.state.node(edge.targetNodeId)?.label ?? '?';
    return `${source} → ${target}`;
  });

  readonly issues = computed(() =>
    validateDiagram(this.state.nodes(), this.state.edges()),
  );

  readonly typeLabel = computed(
    () => AWS_SERVICE_MAP.get(this.node()?.type ?? 'vpc')?.label ?? '',
  );

  readonly kindLabel = computed(() => {
    const edge = this.edge();
    return edge ? EDGE_KIND_LABELS[edge.kind] : '';
  });

  /** The kind this edge would have if drawn the other way, when that's allowed. */
  readonly reversedKind = computed(() => {
    const edge = this.edge();
    const source = edge && this.state.node(edge.sourceNodeId);
    const target = edge && this.state.node(edge.targetNodeId);
    if (!source || !target) return null;
    const rule = matchRule(target.type, source.type);
    return rule ? EDGE_KIND_LABELS[rule.kind] : null;
  });

  reverseEdge(id: string): void {
    const edge = this.state.edges().find((e) => e.id === id);
    const source = edge && this.state.node(edge.sourceNodeId);
    const target = edge && this.state.node(edge.targetNodeId);
    const rule = source && target && matchRule(target.type, source.type);
    if (!edge || !rule) return;
    this.state.updateEdge(id, {
      kind: rule.kind,
      sourceNodeId: edge.targetNodeId,
      sourcePortId: edge.targetPortId,
      targetNodeId: edge.sourceNodeId,
      targetPortId: edge.sourcePortId,
      properties: undefined,
    });
  }

  focusLabel(): void {
    if (this.node()) this.focusRequests.update((n) => n + 1);
  }

  // Handlers take ids bound at render time: a blur-triggered change event can
  // fire after the selection has already moved to another node.
  setLabel(id: string, label: string): void {
    const node = this.state.node(id);
    const trimmed = label.trim();
    if (node && trimmed && trimmed !== node.label) {
      this.state.updateNode(id, { label: trimmed });
    }
  }

  setNodeProperty(id: string, key: string, value: string): void {
    const node = this.state.node(id);
    if (!node || (node.properties[key] ?? '') === value) return;
    const properties = { ...node.properties };
    if (value) {
      properties[key] = value;
    } else {
      delete properties[key];
    }
    this.state.updateNode(id, { properties });
  }

  setEdgeLabel(id: string, label: string): void {
    const edge = this.state.edges().find((e) => e.id === id);
    if (edge && (label.trim() || undefined) !== edge.label) {
      this.state.updateEdge(id, { label: label.trim() || undefined });
    }
  }

  selectIssue(nodeId?: string): void {
    if (nodeId) this.state.selectNode(nodeId);
  }

  setEdgeProperty(id: string, key: string, value: string): void {
    const edge = this.state.edges().find((e) => e.id === id);
    if (!edge || (edge.properties?.[key] ?? '') === value) return;
    const properties = { ...edge.properties };
    if (value) {
      properties[key] = value;
    } else {
      delete properties[key];
    }
    this.state.updateEdge(id, { properties });
  }
}
