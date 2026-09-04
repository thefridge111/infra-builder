import {
  AwsServiceType,
  EdgeKind,
  PropertyField,
  EdgeRule,
  Port,
  CanvasNode,
  EdgeKindLabel,
} from '../../models';

export interface AwsServiceConfig {
  type: AwsServiceType;
  label: string;
  category: string;
  color: string;
  iconPath: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultPorts: Port[];
  container?: boolean;
  edgeRules: EdgeRule[];
  propertyFields: PropertyField[];
}

export abstract class BaseAwsService {
  readonly type: AwsServiceType;
  readonly label: string;
  readonly category: string;
  readonly color: string;
  readonly iconPath: string;
  readonly defaultWidth: number;
  readonly defaultHeight: number;
  readonly defaultPorts: Port[];
  readonly container: boolean;

  readonly edgeRules: EdgeRule[];
  readonly propertyFields: PropertyField[];

  constructor(config: AwsServiceConfig) {
    this.type = config.type;
    this.label = config.label;
    this.category = config.category;
    this.color = config.color;
    this.iconPath = config.iconPath;
    this.defaultWidth = config.defaultWidth;
    this.defaultHeight = config.defaultHeight;
    this.defaultPorts = config.defaultPorts;
    this.container = config.container ?? false;

    this.edgeRules = config.edgeRules;
    this.propertyFields = config.propertyFields;
  }

  /**
   * Create a default node instance for this service.
   */
  createNode(
    overrides: Partial<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      properties: Record<string, string>;
    }> = {},
  ): CanvasNode {
    return {
      id: overrides.id ?? `${this.type}-${Date.now()}`,
      type: this,
      label: this.label,
      x: overrides.x ?? 0,
      y: overrides.y ?? 0,
      width: overrides.width ?? this.defaultWidth,
      height: overrides.height ?? this.defaultHeight,
      ports: this.defaultPorts.map((p) => ({ ...p })),
      properties: overrides.properties ?? {},
    };
  }

  /**
   * Validate a proposed connection from this service to another.
   * @param targetType The type of node this edge connects to
   * @param direction 'outgoing' if from this node to target, 'incoming' if from target node to this node.
   * @returns Result describing whether edge is allowed
   */
  validateEdge(
    targetType: BaseAwsService,
    direction: 'outgoing' | 'incoming',
  ): EdgeValidationResult {
    let rules, match;
    if (direction === 'outgoing') {
      rules = this.edgeRules.filter((r) => r.source.includes(this.type));
      match = rules.find((r) => r.target.includes(targetType.type));
    } else {
      rules = this.edgeRules.filter((r) => r.target.includes(this.type));
      match = rules.find((r) => r.source.includes(targetType.type));
    }

    return {
      allowed: match !== undefined,
      kind: match?.kind,
      label: match?.kind ? EdgeKindLabel[match.kind] : '',
      reason: match
        ? undefined
        : `No rule allows ${this.type} -> ${targetType.type}`,
    };
  }

  /** Get property fields for this service. */
  getPropertyFields(): PropertyField[] {
    return this.propertyFields;
  }
}

export interface EdgeValidationResult {
  allowed: boolean;
  kind?: EdgeKind;
  label?: string;
  reason?: string;
}
