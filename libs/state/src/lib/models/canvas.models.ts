import { BaseAwsService } from '../services/classes';

export type AwsServiceType =
  | 'vpc'
  | 'subnet'
  | 'internet-gateway'
  | 'nat-gateway'
  | 'ec2'
  | 'lambda'
  | 'ecs'
  | 's3'
  | 'ebs'
  | 'rds'
  | 'dynamodb'
  | 'iam-role'
  | 'security-group'
  | 'alb'
  | 'sqs'
  | 'sns'
  | 'eventbridge'
  | 'api-gateway'
  | 'kinesis';

export const EdgeKind = {
  dlq: 'dlq',
  trigger: 'trigger',
  eventSource: 'eventSource',
  attaches: 'attaches',
  network: 'network',
  dependsOn: 'dependsOn',
} as const;

export const EdgeKindLabel: Record<EdgeKind, string> = {
  [EdgeKind.dlq]: 'DLQ Destination',
  [EdgeKind.trigger]: 'Trigger',
  [EdgeKind.eventSource]: 'Event Source',
  [EdgeKind.attaches]: 'Attaches to',
  [EdgeKind.network]: 'Routes to',
  [EdgeKind.dependsOn]: 'Depends on',
};

export type EdgeKind = (typeof EdgeKind)[keyof typeof EdgeKind];

export interface Port {
  id: string;
  side: 'top' | 'right' | 'bottom' | 'left';
  offset: number;
}

export interface CanvasNode {
  id: string;
  type: BaseAwsService;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  ports: Port[];
  properties: Record<string, string>;
  parentId?: string;
}

export interface CanvasEdge {
  id: string;
  kind: EdgeKind;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  label?: string;
  properties?: Record<string, string>;
}

export interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  zoom: number;
  panX: number;
  panY: number;
}

export interface PropertyField {
  key: string;
  label: string;
  placeholder?: string;
  options?: string[];
}

export interface EdgeRule {
  source: AwsServiceType[];
  target: AwsServiceType[];
  kind: EdgeKind;
  label: string;
}
