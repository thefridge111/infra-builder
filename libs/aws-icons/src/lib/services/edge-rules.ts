import { AwsServiceType, EdgeKind, EdgeRule } from '@infra-builder/state';

const COMPUTE: AwsServiceType[] = ['ec2', 'lambda', 'ecs'];

/** Which connections are meaningful, checked in order. First match wins. */
export const EDGE_RULES: EdgeRule[] = [
  {
    source: [
      's3',
      'sqs',
      'sns',
      'eventbridge',
      'api-gateway',
      'kinesis',
      'dynamodb',
    ],
    target: ['lambda'],
    kind: 'trigger',
  },
  { source: ['sns', 'eventbridge'], target: ['sqs'], kind: 'trigger' },
  { source: ['api-gateway'], target: ['alb', 'ec2'], kind: 'network' },
  { source: ['iam-role'], target: COMPUTE, kind: 'attaches' },
  {
    source: ['security-group'],
    target: [...COMPUTE, 'rds', 'alb'],
    kind: 'attaches',
  },
  { source: ['ebs'], target: ['ec2'], kind: 'attaches' },
  { source: ['internet-gateway'], target: ['vpc'], kind: 'network' },
  { source: ['nat-gateway'], target: ['internet-gateway'], kind: 'network' },
  { source: ['alb'], target: ['ec2', 'ecs'], kind: 'network' },
  {
    source: COMPUTE,
    target: ['s3', 'dynamodb', 'rds', 'sqs', 'sns', 'eventbridge', 'kinesis'],
    kind: 'depends-on',
  },
  { source: COMPUTE, target: COMPUTE, kind: 'depends-on' },
];

/**
 * Resolves the kind of an edge between two service types. Tries the reverse
 * direction too so users can draw in either direction.
 */
export function resolveEdge(
  source: AwsServiceType,
  target: AwsServiceType,
): { kind: EdgeKind; flipped: boolean } | null {
  const match = (a: AwsServiceType, b: AwsServiceType) =>
    EDGE_RULES.find((r) => r.source.includes(a) && r.target.includes(b));
  const direct = match(source, target);
  if (direct) return { kind: direct.kind, flipped: false };
  const reverse = match(target, source);
  if (reverse) return { kind: reverse.kind, flipped: true };
  return null;
}

export const EDGE_KIND_LABELS: Record<EdgeKind, string> = {
  trigger: 'Trigger',
  attaches: 'Attaches to',
  network: 'Routes to',
  'depends-on': 'Depends on',
};
