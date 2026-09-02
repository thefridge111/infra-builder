import {
  AwsServiceType,
  EdgeKind,
  PropertyField,
  EdgeRule,
} from '../../models';

export interface AwsServiceConfig {
  type: AwsServiceType;
  category: string;

  edgeRules: EdgeRule[];
  propertyFields: PropertyField[];
}

export abstract class BaseAwsService {
  readonly type: AwsServiceType;
  readonly category: string;

  readonly edgeRules: EdgeRule[];
  readonly propertyFields: PropertyField[];

  constructor(config: AwsServiceConfig) {
    this.type = config.type;
    this.category = config.category;

    this.edgeRules = config.edgeRules;
    this.propertyFields = config.propertyFields;
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
      allowed: !match,
      kind: match?.kind,
      reason: match
        ? undefined
        : `No rule allows ${this.type} -> ${targetType}`,
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
  reason?: string;
}
