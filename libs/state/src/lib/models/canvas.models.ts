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
  | 'alb';

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
}

export interface CanvasEdge {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  label?: string;
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
}
