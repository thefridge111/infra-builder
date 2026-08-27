import { AwsServiceType, PropertyField } from '@infra-builder/state';

/** Editable properties per service. Keys map 1:1 to CloudFormation properties. */
export const NODE_PROPERTY_FIELDS: Partial<
  Record<AwsServiceType, PropertyField[]>
> = {
  vpc: [{ key: 'CidrBlock', label: 'CIDR block', placeholder: '10.0.0.0/16' }],
  subnet: [
    { key: 'CidrBlock', label: 'CIDR block', placeholder: '10.0.1.0/24' },
    {
      key: 'AvailabilityZone',
      label: 'Availability zone',
      placeholder: 'us-east-1a',
    },
  ],
  ec2: [
    {
      key: 'InstanceType',
      label: 'Instance type',
      options: ['t3.micro', 't3.small', 't3.medium', 'm5.large', 'c5.large'],
    },
    { key: 'ImageId', label: 'AMI', placeholder: 'ami-...' },
  ],
  lambda: [
    {
      key: 'Runtime',
      label: 'Runtime',
      options: ['nodejs22.x', 'nodejs20.x', 'python3.13', 'python3.12'],
    },
    { key: 'Handler', label: 'Handler', placeholder: 'index.handler' },
    { key: 'MemorySize', label: 'Memory (MB)', placeholder: '128' },
    { key: 'Timeout', label: 'Timeout (s)', placeholder: '3' },
  ],
  s3: [{ key: 'BucketName', label: 'Bucket name', placeholder: 'optional' }],
  rds: [
    {
      key: 'Engine',
      label: 'Engine',
      options: ['mysql', 'postgres', 'mariadb'],
    },
    {
      key: 'DBInstanceClass',
      label: 'Instance class',
      options: ['db.t3.micro', 'db.t3.small', 'db.r5.large'],
    },
    { key: 'AllocatedStorage', label: 'Storage (GB)', placeholder: '20' },
  ],
  dynamodb: [
    { key: 'TableName', label: 'Table name', placeholder: 'optional' },
    {
      key: 'BillingMode',
      label: 'Billing',
      options: ['PAY_PER_REQUEST', 'PROVISIONED'],
    },
  ],
  sqs: [
    { key: 'QueueName', label: 'Queue name', placeholder: 'optional' },
    {
      key: 'VisibilityTimeout',
      label: 'Visibility timeout (s)',
      placeholder: '30',
    },
  ],
  sns: [{ key: 'TopicName', label: 'Topic name', placeholder: 'optional' }],
  kinesis: [{ key: 'ShardCount', label: 'Shards', placeholder: '1' }],
  'security-group': [{ key: 'GroupDescription', label: 'Description' }],
  alb: [
    {
      key: 'Scheme',
      label: 'Scheme',
      options: ['internet-facing', 'internal'],
    },
  ],
  ebs: [{ key: 'Size', label: 'Size (GB)', placeholder: '8' }],
  'api-gateway': [
    { key: 'Name', label: 'API name', placeholder: 'defaults to node name' },
  ],
};

/** Editable properties per trigger source type. */
export const TRIGGER_PROPERTY_FIELDS: Partial<
  Record<AwsServiceType, PropertyField[]>
> = {
  s3: [
    {
      key: 'Event',
      label: 'Event',
      options: [
        's3:ObjectCreated:*',
        's3:ObjectRemoved:*',
        's3:ObjectCreated:Put',
      ],
    },
    { key: 'Prefix', label: 'Key prefix', placeholder: 'uploads/' },
  ],
  sqs: [{ key: 'BatchSize', label: 'Batch size', placeholder: '10' }],
  kinesis: [
    { key: 'BatchSize', label: 'Batch size', placeholder: '100' },
    {
      key: 'StartingPosition',
      label: 'Starting position',
      options: ['LATEST', 'TRIM_HORIZON'],
    },
  ],
  dynamodb: [{ key: 'BatchSize', label: 'Batch size', placeholder: '100' }],
  eventbridge: [
    {
      key: 'ScheduleExpression',
      label: 'Schedule',
      placeholder: 'rate(5 minutes)',
    },
  ],
  'api-gateway': [
    { key: 'RouteKey', label: 'Route', placeholder: 'GET /items' },
  ],
};

/** Data services a compute node can be granted IAM access to via a depends-on edge. */
export const ACCESS_TARGETS: ReadonlySet<AwsServiceType> =
  new Set<AwsServiceType>([
    's3',
    'dynamodb',
    'sqs',
    'sns',
    'kinesis',
    'eventbridge',
  ]);

export type AccessMode = 'read' | 'write' | 'read-write';
export const DEFAULT_ACCESS: AccessMode = 'read-write';

export const ACCESS_PROPERTY_FIELDS: PropertyField[] = [
  {
    key: 'Access',
    label: 'IAM access',
    options: ['read', 'write', 'read-write'],
  },
];
