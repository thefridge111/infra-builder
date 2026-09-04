import {
  AwsServiceType,
  EdgeKind,
  EdgeRule,
  EdgeKindLabel,
} from './canvas.models';

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

/** Global edge rules. First match wins. */
export const EDGE_RULES: EdgeRule[] = [
  {
    source: DATA_SERVICES,
    target: ['lambda'],
    kind: EdgeKind.trigger,
    label: EdgeKindLabel[EdgeKind.trigger],
  },
  {
    source: ['s3', 'sns', 'eventbridge'],
    target: ['sqs'],
    kind: EdgeKind.trigger,
    label: EdgeKindLabel[EdgeKind.trigger],
  },
  {
    source: ['s3', 'eventbridge'],
    target: ['sns'],
    kind: EdgeKind.trigger,
    label: EdgeKindLabel[EdgeKind.trigger],
  },
  {
    source: ['iam-role'],
    target: ['ec2', 'lambda', 'ecs'],
    kind: EdgeKind.attaches,
    label: EdgeKindLabel[EdgeKind.attaches],
  },
  {
    source: ['security-group'],
    target: ['ec2', 'lambda', 'ecs', 'rds', 'alb'],
    kind: EdgeKind.attaches,
    label: EdgeKindLabel[EdgeKind.attaches],
  },
  {
    source: ['ebs'],
    target: ['ec2'],
    kind: EdgeKind.attaches,
    label: EdgeKindLabel[EdgeKind.attaches],
  },
  {
    source: ['security-group'],
    target: ['security-group'],
    kind: EdgeKind.network,
    label: EdgeKindLabel[EdgeKind.network],
  },
  {
    source: ['internet-gateway'],
    target: ['vpc'],
    kind: EdgeKind.network,
    label: EdgeKindLabel[EdgeKind.network],
  },
  {
    source: ['alb'],
    target: ['ec2', 'lambda'],
    kind: EdgeKind.network,
    label: EdgeKindLabel[EdgeKind.network],
  },
  {
    source: ['ec2', 'lambda', 'ecs'],
    target: DATA_SERVICES,
    kind: EdgeKind.dependsOn,
    label: EdgeKindLabel[EdgeKind.dependsOn],
  },
  {
    source: ['ec2', 'lambda', 'ecs'],
    target: ['ec2', 'lambda', 'ecs'],
    kind: EdgeKind.dependsOn,
    label: EdgeKindLabel[EdgeKind.dependsOn],
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
