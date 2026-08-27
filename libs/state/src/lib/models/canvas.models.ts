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

export type EdgeKind = 'trigger' | 'attaches' | 'network' | 'depends-on';

export interface Port {
  id: string;
  side: 'top' | 'right' | 'bottom' | 'left';
  offset: number;
}

export interface CanvasNode {
  id: string;
  type: AwsServiceType;
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

export interface AwsServiceDefinition {
  type: AwsServiceType;
  label: string;
  category: string;
  color: string;
  iconPath: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultPorts: Port[];
  /** Container nodes (VPC, Subnet) can be resized and own child nodes. */
  container?: boolean;
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
}
