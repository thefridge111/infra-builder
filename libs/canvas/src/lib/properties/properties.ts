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
      if (input && request !== this.focusHandled) {
        this.focusHandled = request;
        input.nativeElement.select();
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
    if (edge?.kind !== 'trigger') return [];
    const source = this.state.node(edge.sourceNodeId);
    return (source && TRIGGER_PROPERTY_FIELDS[source.type]) ?? [];
  });

  readonly edgeSummary = computed(() => {
    const edge = this.edge();
    if (!edge) return '';
    const source = this.state.node(edge.sourceNodeId)?.label ?? '?';
    const target = this.state.node(edge.targetNodeId)?.label ?? '?';
    return `${source} → ${target}`;
  });

  readonly typeLabel = computed(
    () => AWS_SERVICE_MAP.get(this.node()?.type ?? 'vpc')?.label ?? '',
  );

  readonly kindLabel = computed(() => {
    const edge = this.edge();
    return edge ? EDGE_KIND_LABELS[edge.kind] : '';
  });

  focusLabel(): void {
    this.focusRequests.update((n) => n + 1);
  }

  setLabel(label: string): void {
    const node = this.node();
    if (node && label.trim() && label !== node.label) {
      this.state.updateNode(node.id, { label: label.trim() });
    }
  }

  setNodeProperty(key: string, value: string): void {
    const node = this.node();
    if (!node) return;
    const properties = { ...node.properties };
    if (value) {
      properties[key] = value;
    } else {
      delete properties[key];
    }
    this.state.updateNode(node.id, { properties });
  }

  setEdgeProperty(key: string, value: string): void {
    const edge = this.edge();
    if (!edge) return;
    const properties = { ...edge.properties };
    if (value) {
      properties[key] = value;
    } else {
      delete properties[key];
    }
    this.state.updateEdge(edge.id, { properties });
  }
}
