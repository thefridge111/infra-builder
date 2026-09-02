import { AwsServiceType, EdgeKind, EdgeRule } from './canvas.models';

export const EDGE_KIND_LABELS: Record<EdgeKind, string> = {
  trigger: 'Trigger',
  attaches: 'Attaches to',
  network: 'Routes to',
  'depends-on': 'Depends on',
};

const COMPUTE: AwsServiceType[] = ['ec2', 'lambda'];
const DATA_SERVICES: AwsServiceType[] = [
  's3',
  'dynamodb',
  'rds',
  'sqs',
  'sns',
  'kinesis',
  'eventbridge',
];

export const EDGE_RULES: EdgeRule[] = [
  { source: DATA_SERVICES, target: ['lambda'], kind: 'trigger' },
  { source: ['s3', 'sns', 'eventbridge'], target: ['sqs'], kind: 'trigger' },
  { source: ['s3', 'eventbridge'], target: ['sns'], kind: 'trigger' },
  { source: ['iam-role'], target: COMPUTE, kind: 'attaches' },
  {
    source: ['security-group'],
    target: [...COMPUTE, 'rds', 'alb'],
    kind: 'attaches',
  },
  { source: ['ebs'], target: ['ec2'], kind: 'attaches' },
  { source: ['security-group'], target: ['security-group'], kind: 'network' },
  { source: ['internet-gateway'], target: ['vpc'], kind: 'network' },
  { source: ['alb'], target: ['ec2', 'lambda'], kind: 'network' },
  { source: [...COMPUTE, 'ecs'], target: DATA_SERVICES, kind: 'depends-on' },
  {
    source: [...COMPUTE, 'ecs'],
    target: [...COMPUTE, 'ecs'],
    kind: 'depends-on',
  },
];

export function resolveEdge(
  source: AwsServiceType,
  target: AwsServiceType,
): { kind: EdgeKind; flipped: boolean } | null {
  const direct = matchRule(source, target);
  if (direct) return { kind: direct.kind, flipped: false };
  const reverse = matchRule(target, source);
  if (reverse) return { kind: reverse.kind, flipped: true };
  return null;
}

export function matchRule(
  source: AwsServiceType,
  target: AwsServiceType,
): EdgeRule | undefined {
  return EDGE_RULES.find(
    (r) => r.source.includes(source) && r.target.includes(target),
  );
}
