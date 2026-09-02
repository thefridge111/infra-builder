import { AwsServiceType } from '@infra-builder/state';

export interface PropertyField {
  key: string;
  label: string;
  placeholder?: string;
  options?: string[];
}

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

/** Map AWS service type to CloudFormation resource type. */
export const RESOURCE_TYPES: Partial<Record<AwsServiceType, string>> = {
  vpc: 'AWS::EC2::VPC',
  subnet: 'AWS::EC2::Subnet',
  'internet-gateway': 'AWS::EC2::InternetGateway',
  'nat-gateway': 'AWS::EC2::NATGateway',
  ec2: 'AWS::EC2::Instance',
  lambda: 'AWS::Lambda::Function',
  ecs: 'AWS::ECS::Service',
  s3: 'AWS::S3::Bucket',
  ebs: 'AWS::EC2::Volume',
  rds: 'AWS::RDS::DBInstance',
  dynamodb: 'AWS::DynamoDB::Table',
  sqs: 'AWS::SQS::Queue',
  sns: 'AWS::SNS::Topic',
  kinesis: 'AWS::Kinesis::Stream',
  'security-group': 'AWS::EC2::SecurityGroup',
  alb: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
  'api-gateway': 'AWS::ApiGateway::RestApi',
  'iam-role': 'AWS::IAM::Role',
};

/** Default properties for each resource type. */
export const DEFAULT_PROPS: Partial<
  Record<AwsServiceType, Record<string, unknown>>
> = {
  vpc: {
    CidrBlock: '10.0.0.0/16',
    EnableDnsSupport: true,
    EnableDnsHostnames: true,
  },
  subnet: { CidrBlock: '10.0.1.0/24', MapPublicIpOnLaunch: false },
  ec2: { InstanceType: 't3.micro', ImageId: 'ami-0c55b159cbfafe1f0' },
  lambda: {
    Runtime: 'nodejs20.x',
    Handler: 'index.handler',
    MemorySize: 128,
    Timeout: 3,
  },
  s3: {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        { ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } },
      ],
    },
  },
  rds: {
    DBInstanceClass: 'db.t3.micro',
    Engine: 'postgres',
    AllocatedStorage: 20,
  },
  dynamodb: { BillingMode: 'PAY_PER_REQUEST' },
  sqs: { VisibilityTimeout: 30 },
  sns: {},
  kinesis: { ShardCount: 1 },
  'security-group': { GroupDescription: 'Security group' },
  alb: { Scheme: 'internet-facing' },
  ebs: { Size: 8 },
  'api-gateway': { EndpointConfiguration: { Types: ['REGIONAL'] } },
  'iam-role': {
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: 'ec2.amazonaws.com' },
          Action: 'sts:AssumeRole',
        },
      ],
    },
  },
};

/** IAM actions for each service when granting access. */
export const ACCESS_ACTIONS: Partial<
  Record<AwsServiceType, { read: string[]; write: string[] }>
> = {
  s3: {
    read: ['s3:GetObject', 's3:ListBucket'],
    write: ['s3:PutObject', 's3:DeleteObject'],
  },
  dynamodb: {
    read: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan'],
    write: ['dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem'],
  },
  sqs: {
    read: ['sqs:ReceiveMessage', 'sqs:GetQueueAttributes'],
    write: ['sqs:SendMessage', 'sqs:DeleteMessage'],
  },
  sns: { read: ['sns:GetTopicAttributes'], write: ['sns:Publish'] },
  kinesis: {
    read: [
      'kinesis:GetRecords',
      'kinesis:GetShardIterator',
      'kinesis:DescribeStream',
    ],
    write: ['kinesis:PutRecord', 'kinesis:PutRecords'],
  },
  eventbridge: {
    read: ['events:DescribeRule'],
    write: ['events:PutEvents', 'events:PutRule', 'events:PutTargets'],
  },
};

/** Principal for Lambda invoke permissions. */
export const INVOKE_PRINCIPALS: Partial<Record<AwsServiceType, string>> = {
  s3: 's3.amazonaws.com',
  sns: 'sns.amazonaws.com',
  eventbridge: 'events.amazonaws.com',
  'api-gateway': 'apigateway.amazonaws.com',
};

/** Stream sources that can trigger Lambda. */
export const STREAM_SOURCES: Partial<
  Record<AwsServiceType, { props: PropertyField[]; policy: string }>
> = {
  kinesis: {
    props: [],
    policy:
      'kinesis:GetRecords,kinesis:GetShardIterator,kinesis:DescribeStream',
  },
  dynamodb: {
    props: [],
    policy:
      'dynamodb:GetRecords,dynamodb:GetShardIterator,dynamodb:DescribeStream',
  },
};
