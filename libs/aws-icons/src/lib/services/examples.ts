import {
  AwsServiceType,
  CanvasEdge,
  CanvasNode,
  CanvasState,
} from '@infra-builder/state';
import { AWS_SERVICE_MAP } from './definitions';
import { resolveEdge } from './edge-rules';

export interface ExampleProject {
  name: string;
  description: string;
  build: () => CanvasState;
}

interface Spec {
  type: AwsServiceType;
  label: string;
  x: number;
  y: number;
  parent?: string;
  size?: [number, number];
  properties?: Record<string, string>;
}

/** Builds a state from compact node specs; edges are validated via the rules. */
function diagram(
  nodes: Record<string, Spec>,
  links: [string, string, Record<string, string>?][],
): CanvasState {
  const built: Record<string, CanvasNode> = {};
  Object.entries(nodes).forEach(([key, spec]) => {
    const def = AWS_SERVICE_MAP.get(spec.type);
    if (!def) throw new Error(`Unknown service ${spec.type}`);
    built[key] = {
      id: `ex-${key}`,
      type: spec.type,
      label: spec.label,
      x: spec.x,
      y: spec.y,
      width: spec.size?.[0] ?? def.defaultWidth,
      height: spec.size?.[1] ?? def.defaultHeight,
      ports: def.defaultPorts.map((p) => ({ ...p })),
      properties: spec.properties ?? {},
      parentId: spec.parent ? `ex-${spec.parent}` : undefined,
    };
  });

  const edges: CanvasEdge[] = links.map(([from, to, properties], i) => {
    const source = built[from];
    const target = built[to];
    const resolved = resolveEdge(source.type, target.type);
    if (!resolved) throw new Error(`No rule for ${from} → ${to}`);
    const [a, b] = resolved.flipped ? [target, source] : [source, target];
    const ports = pickPorts(a, b);
    return {
      id: `ex-edge-${i}`,
      kind: resolved.kind,
      sourceNodeId: a.id,
      sourcePortId: ports[0],
      targetNodeId: b.id,
      targetPortId: ports[1],
      properties,
    };
  });

  return {
    nodes: Object.values(built),
    edges,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    zoom: 1,
    panX: 0,
    panY: 0,
  };
}

/** Picks the pair of facing ports (falls back to the first port on each side). */
function pickPorts(a: CanvasNode, b: CanvasNode): [string, string] {
  const dx = b.x + b.width / 2 - (a.x + a.width / 2);
  const dy = b.y + b.height / 2 - (a.y + a.height / 2);
  const horizontal = Math.abs(dx) > Math.abs(dy);
  const sideA = horizontal
    ? dx > 0
      ? 'right'
      : 'left'
    : dy > 0
      ? 'bottom'
      : 'top';
  const sideB = horizontal
    ? dx > 0
      ? 'left'
      : 'right'
    : dy > 0
      ? 'top'
      : 'bottom';
  const port = (n: CanvasNode, side: string) =>
    (n.ports.find((p) => p.side === side) ?? n.ports[0]).id;
  return [port(a, sideA), port(b, sideB)];
}

export const EXAMPLE_PROJECTS: ExampleProject[] = [
  {
    name: 'Serverless image pipeline',
    description:
      'HTTP API → Lambda → S3 uploads trigger a resizer that writes to DynamoDB',
    build: () =>
      diagram(
        {
          api: { type: 'api-gateway', label: 'Upload API', x: 80, y: 200 },
          upload: { type: 'lambda', label: 'Upload Handler', x: 320, y: 200 },
          bucket: { type: 's3', label: 'Uploads Bucket', x: 560, y: 200 },
          resize: {
            type: 'lambda',
            label: 'Image Resizer',
            x: 800,
            y: 200,
            properties: { MemorySize: '1024', Timeout: '30' },
          },
          table: { type: 'dynamodb', label: 'Image Metadata', x: 1040, y: 200 },
          queue: { type: 'sqs', label: 'Failed Jobs', x: 800, y: 400 },
          role: { type: 'iam-role', label: 'Pipeline Role', x: 440, y: 400 },
        },
        [
          ['api', 'upload', { RouteKey: 'POST /images' }],
          ['upload', 'bucket'],
          [
            'bucket',
            'resize',
            { Event: 's3:ObjectCreated:*', Prefix: 'uploads/' },
          ],
          ['resize', 'table'],
          ['resize', 'queue'],
          ['role', 'upload'],
          ['role', 'resize'],
        ],
      ),
  },
  {
    name: 'Three-tier web app',
    description:
      'ALB in public subnets, EC2 app servers and RDS in private subnets',
    build: () =>
      diagram(
        {
          vpc: {
            type: 'vpc',
            label: 'App VPC',
            x: 200,
            y: 80,
            size: [900, 820],
          },
          igw: {
            type: 'internet-gateway',
            label: 'Internet Gateway',
            x: 20,
            y: 200,
          },
          pub: {
            type: 'subnet',
            label: 'Public Subnet',
            x: 240,
            y: 140,
            parent: 'vpc',
            size: [820, 180],
            properties: { CidrBlock: '10.0.1.0/24' },
          },
          priv: {
            type: 'subnet',
            label: 'Private Subnet',
            x: 240,
            y: 360,
            parent: 'vpc',
            size: [820, 320],
            properties: { CidrBlock: '10.0.2.0/24' },
          },
          data: {
            type: 'subnet',
            label: 'Data Subnet',
            x: 240,
            y: 720,
            parent: 'vpc',
            size: [820, 160],
            properties: { CidrBlock: '10.0.3.0/24' },
          },
          alb: { type: 'alb', label: 'Web ALB', x: 560, y: 200, parent: 'pub' },
          nat: {
            type: 'nat-gateway',
            label: 'NAT Gateway',
            x: 280,
            y: 200,
            parent: 'pub',
          },
          web1: {
            type: 'ec2',
            label: 'App Server 1',
            x: 440,
            y: 420,
            parent: 'priv',
          },
          web2: {
            type: 'ec2',
            label: 'App Server 2',
            x: 700,
            y: 420,
            parent: 'priv',
          },
          db: {
            type: 'rds',
            label: 'App Database',
            x: 580,
            y: 760,
            parent: 'data',
            properties: { Engine: 'postgres' },
          },
          appSg: {
            type: 'security-group',
            label: 'App SG',
            x: 700,
            y: 560,
            parent: 'priv',
            properties: { GroupDescription: 'App servers' },
          },
          dbSg: {
            type: 'security-group',
            label: 'DB SG',
            x: 900,
            y: 760,
            parent: 'data',
            properties: { GroupDescription: 'Database' },
          },
          role: {
            type: 'iam-role',
            label: 'App Role',
            x: 440,
            y: 560,
            parent: 'priv',
          },
        },
        [
          ['igw', 'vpc'],
          ['alb', 'web1'],
          ['alb', 'web2'],
          ['web1', 'db'],
          ['web2', 'db'],
          ['appSg', 'web1'],
          ['appSg', 'web2'],
          ['dbSg', 'db'],
          ['role', 'web1'],
          ['role', 'web2'],
        ],
      ),
  },
];
