import {
  AwsServiceType,
  CanvasEdge,
  CanvasNode,
  EdgeKind,
} from '@infra-builder/state';
import { buildTemplate } from './cloudformation-template';

function node(
  id: string,
  type: AwsServiceType,
  extra: Partial<CanvasNode> = {},
): CanvasNode {
  return {
    id,
    type,
    label: id,
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    ports: [],
    properties: {},
    ...extra,
  };
}

function edge(
  source: string,
  target: string,
  kind: EdgeKind,
  properties?: Record<string, string>,
): CanvasEdge {
  return {
    id: `${source}-${target}`,
    kind,
    sourceNodeId: source,
    sourcePortId: 'right',
    targetNodeId: target,
    targetPortId: 'left',
    properties,
  };
}

describe('buildTemplate', () => {
  it('derives unique logical ids from labels', () => {
    const t = buildTemplate(
      [
        node('a', 's3', { label: 'my bucket' }),
        node('b', 's3', { label: 'My Bucket' }),
      ],
      [],
    );
    expect(Object.keys(t.Resources)).toEqual(['MyBucket', 'MyBucket2']);
  });

  it('wires containment into VpcId and SubnetId', () => {
    const t = buildTemplate(
      [
        node('vpc', 'vpc'),
        node('subnet', 'subnet', { parentId: 'vpc' }),
        node('ec2', 'ec2', { parentId: 'subnet' }),
        node('sg', 'security-group', { parentId: 'subnet' }),
      ],
      [],
    );
    expect(t.Resources['Subnet'].Properties?.['VpcId']).toEqual({ Ref: 'Vpc' });
    expect(t.Resources['Ec2'].Properties?.['SubnetId']).toEqual({
      Ref: 'Subnet',
    });
    expect(t.Resources['Sg'].Properties?.['VpcId']).toEqual({ Ref: 'Vpc' });
  });

  it('turns an S3 trigger into a notification plus permission', () => {
    const t = buildTemplate(
      [node('bucket', 's3'), node('fn', 'lambda')],
      [edge('bucket', 'fn', 'trigger', { Prefix: 'uploads/' })],
    );
    const notification = t.Resources['Bucket'].Properties?.[
      'NotificationConfiguration'
    ] as { LambdaConfigurations: Record<string, unknown>[] };
    expect(notification.LambdaConfigurations[0]['Event']).toBe(
      's3:ObjectCreated:*',
    );
    expect(notification.LambdaConfigurations[0]['Filter']).toBeDefined();
    expect(t.Resources['FnBucketPermission'].Type).toBe(
      'AWS::Lambda::Permission',
    );
    expect(t.Resources['Bucket'].DependsOn).toEqual(['FnBucketPermission']);
  });

  it('turns queue and stream triggers into event source mappings', () => {
    const t = buildTemplate(
      [node('q', 'sqs'), node('table', 'dynamodb'), node('fn', 'lambda')],
      [
        edge('q', 'fn', 'trigger', { BatchSize: '5' }),
        edge('table', 'fn', 'trigger'),
      ],
    );
    expect(t.Resources['FnQMapping'].Properties?.['BatchSize']).toBe(5);
    expect(
      t.Resources['FnTableMapping'].Properties?.['EventSourceArn'],
    ).toEqual({
      'Fn::GetAtt': ['Table', 'StreamArn'],
    });
    expect(
      t.Resources['Table'].Properties?.['StreamSpecification'],
    ).toBeDefined();
  });

  it('attaches roles and security groups', () => {
    const t = buildTemplate(
      [
        node('role', 'iam-role'),
        node('fn', 'lambda'),
        node('sg', 'security-group'),
        node('db', 'rds'),
      ],
      [edge('role', 'fn', 'attaches'), edge('sg', 'db', 'attaches')],
    );
    expect(t.Resources['Fn'].Properties?.['Role']).toEqual({
      'Fn::GetAtt': ['Role', 'Arn'],
    });
    expect(t.Resources['Db'].Properties?.['VPCSecurityGroups']).toEqual([
      { Ref: 'Sg' },
    ]);
    expect(t.Parameters?.['DBPassword']).toEqual({
      Type: 'String',
      NoEcho: true,
    });
    expect(t.Resources['LambdaExecutionRole']).toBeUndefined();
  });

  it('gives role-less lambdas a shared execution role', () => {
    const t = buildTemplate([node('fn', 'lambda')], []);
    expect(t.Resources['LambdaExecutionRole'].Type).toBe('AWS::IAM::Role');
    expect(t.Resources['Fn'].Properties?.['Role']).toEqual({
      'Fn::GetAtt': ['LambdaExecutionRole', 'Arn'],
    });
  });

  it('routes an ALB to instances through a target group and listener', () => {
    const t = buildTemplate(
      [node('alb', 'alb'), node('a', 'ec2'), node('b', 'ec2')],
      [edge('alb', 'a', 'network'), edge('alb', 'b', 'network')],
    );
    expect(t.Resources['AlbTargetGroup'].Properties?.['Targets']).toEqual([
      { Id: { Ref: 'A' } },
      { Id: { Ref: 'B' } },
    ]);
    expect(t.Resources['AlbListener']).toBeDefined();
  });

  it('applies user properties over defaults', () => {
    const t = buildTemplate(
      [
        node('fn', 'lambda', {
          properties: { MemorySize: '512', Runtime: 'python3.12' },
        }),
      ],
      [],
    );
    expect(t.Resources['Fn'].Properties?.['MemorySize']).toBe(512);
    expect(t.Resources['Fn'].Properties?.['Runtime']).toBe('python3.12');
  });
});

describe('buildTemplate deployability rules', () => {
  it('spreads ALB and RDS over every subnet in the VPC with distinct AZs', () => {
    const t = buildTemplate(
      [
        node('vpc', 'vpc'),
        node('a', 'subnet', { parentId: 'vpc' }),
        node('b', 'subnet', { parentId: 'vpc' }),
        node('alb', 'alb', { parentId: 'a' }),
        node('db', 'rds', { parentId: 'b' }),
      ],
      [],
    );
    expect(t.Resources['Alb'].Properties?.['Subnets']).toEqual([
      { Ref: 'A' },
      { Ref: 'B' },
    ]);
    expect(t.Resources['DbSubnetGroup'].Properties?.['SubnetIds']).toEqual([
      { Ref: 'A' },
      { Ref: 'B' },
    ]);
    expect(t.Resources['A'].Properties?.['CidrBlock']).toBe('10.0.1.0/24');
    expect(t.Resources['B'].Properties?.['CidrBlock']).toBe('10.0.2.0/24');
    expect(t.Resources['B'].Properties?.['AvailabilityZone']).toEqual({
      'Fn::Select': [1, { 'Fn::GetAZs': '' }],
    });
  });

  it('names an HTTP API and gives routed APIs a stage', () => {
    const t = buildTemplate(
      [
        node('api', 'api-gateway', { label: 'Upload API' }),
        node('fn', 'lambda'),
      ],
      [edge('api', 'fn', 'trigger', { RouteKey: 'POST /images' })],
    );
    expect(t.Resources['UploadAPI'].Properties?.['Name']).toBe('Upload API');
    expect(t.Resources['UploadAPIStage'].Properties?.['StageName']).toBe(
      '$default',
    );
    expect(t.Resources['UploadAPIFnRoute'].Properties?.['RouteKey']).toBe(
      'POST /images',
    );
  });

  it('gives event-source and VPC lambdas the managed policies they need', () => {
    const t = buildTemplate(
      [
        node('vpc', 'vpc'),
        node('subnet', 'subnet', { parentId: 'vpc' }),
        node('q', 'sqs'),
        node('fn', 'lambda', { parentId: 'subnet' }),
      ],
      [edge('q', 'fn', 'trigger')],
    );
    const arns = t.Resources['LambdaExecutionRole'].Properties?.[
      'ManagedPolicyArns'
    ] as string[];
    expect(arns.some((a) => a.endsWith('AWSLambdaSQSQueueExecutionRole'))).toBe(
      true,
    );
    expect(
      arns.some((a) => a.endsWith('AWSLambdaVPCAccessExecutionRole')),
    ).toBe(true);
    const config = t.Resources['Fn'].Properties?.['VpcConfig'] as Record<
      string,
      unknown
    >;
    expect(config['SecurityGroupIds']).toEqual([{ Ref: 'FnSecurityGroup' }]);
    expect(t.Resources['FnSecurityGroup'].Properties?.['VpcId']).toEqual({
      Ref: 'Vpc',
    });
  });

  it('orders NAT gateways after the internet gateway attachment', () => {
    const t = buildTemplate(
      [
        node('vpc', 'vpc'),
        node('subnet', 'subnet', { parentId: 'vpc' }),
        node('nat', 'nat-gateway', { parentId: 'subnet' }),
        node('igw', 'internet-gateway'),
      ],
      [edge('igw', 'vpc', 'network')],
    );
    expect(t.Resources['Nat'].DependsOn).toEqual(['VpcIgwAttachment']);
    expect(t.Resources['NatEip'].Type).toBe('AWS::EC2::EIP');
  });

  it('attaches multiple volumes on distinct devices in the instance AZ', () => {
    const t = buildTemplate(
      [node('ec2', 'ec2'), node('v1', 'ebs'), node('v2', 'ebs')],
      [edge('v1', 'ec2', 'attaches'), edge('v2', 'ec2', 'attaches')],
    );
    expect(t.Resources['Ec2V1Attachment'].Properties?.['Device']).toBe(
      '/dev/sdf',
    );
    expect(t.Resources['Ec2V2Attachment'].Properties?.['Device']).toBe(
      '/dev/sdg',
    );
    expect(t.Resources['V1'].Properties?.['AvailabilityZone']).toEqual({
      'Fn::GetAtt': ['Ec2', 'AvailabilityZone'],
    });
  });

  it('adds provisioned throughput and python stubs when selected', () => {
    const t = buildTemplate(
      [
        node('t', 'dynamodb', { properties: { BillingMode: 'PROVISIONED' } }),
        node('fn', 'lambda', { properties: { Runtime: 'python3.12' } }),
      ],
      [],
    );
    expect(
      t.Resources['T'].Properties?.['ProvisionedThroughput'],
    ).toBeDefined();
    const code = t.Resources['Fn'].Properties?.['Code'] as Record<
      string,
      string
    >;
    expect(code['ZipFile']).toContain('def handler');
  });
});

describe('buildTemplate security groups', () => {
  it('drops a half VpcConfig and emits ingress between groups', () => {
    const t = buildTemplate(
      [
        node('fn', 'lambda'),
        node('a', 'security-group'),
        node('b', 'security-group'),
      ],
      [edge('a', 'fn', 'attaches'), edge('a', 'b', 'network')],
    );
    expect(t.Resources['Fn'].Properties?.['VpcConfig']).toBeUndefined();
    expect(
      t.Resources['BFromAIngress'].Properties?.['SourceSecurityGroupId'],
    ).toEqual({ Ref: 'A' });
  });
});

describe('buildTemplate data access', () => {
  it('grants a lambda read access on a queue through a dedicated role', () => {
    const t = buildTemplate(
      [node('fn', 'lambda'), node('q', 'sqs'), node('other', 'lambda')],
      [edge('fn', 'q', 'depends-on', { Access: 'read' })],
    );
    expect(t.Resources['Fn'].Properties?.['Role']).toEqual({
      'Fn::GetAtt': ['FnRole', 'Arn'],
    });
    expect(t.Resources['Other'].Properties?.['Role']).toEqual({
      'Fn::GetAtt': ['LambdaExecutionRole', 'Arn'],
    });
    const policies = t.Resources['FnRole'].Properties?.['Policies'] as Record<
      string,
      unknown
    >[];
    const statement = (
      policies[0]['PolicyDocument'] as { Statement: Record<string, unknown>[] }
    ).Statement[0];
    expect(statement['Action']).toContain('sqs:ReceiveMessage');
    expect(statement['Action']).not.toContain('sqs:SendMessage');
    expect(statement['Resource']).toEqual([{ 'Fn::GetAtt': ['Q', 'Arn'] }]);
  });

  it('grants read-write by default, covering bucket objects, and reuses an attached role', () => {
    const t = buildTemplate(
      [node('role', 'iam-role'), node('fn', 'lambda'), node('bucket', 's3')],
      [edge('role', 'fn', 'attaches'), edge('fn', 'bucket', 'depends-on')],
    );
    const policies = t.Resources['Role'].Properties?.['Policies'] as Record<
      string,
      unknown
    >[];
    const statement = (
      policies[0]['PolicyDocument'] as { Statement: Record<string, unknown>[] }
    ).Statement[0];
    expect(statement['Action']).toEqual(
      expect.arrayContaining(['s3:GetObject', 's3:PutObject']),
    );
    expect((statement['Resource'] as unknown[]).length).toBe(2);
    expect(t.Resources['FnRole']).toBeUndefined();
  });

  it('gives an instance a generated role and profile for table writes', () => {
    const t = buildTemplate(
      [node('ec2', 'ec2'), node('table', 'dynamodb')],
      [edge('ec2', 'table', 'depends-on', { Access: 'write' })],
    );
    expect(t.Resources['Ec2'].Properties?.['IamInstanceProfile']).toEqual({
      Ref: 'Ec2RoleInstanceProfile',
    });
    const policies = t.Resources['Ec2Role'].Properties?.['Policies'] as Record<
      string,
      unknown
    >[];
    const statement = (
      policies[0]['PolicyDocument'] as { Statement: Record<string, unknown>[] }
    ).Statement[0];
    expect(statement['Action']).toContain('dynamodb:PutItem');
    expect(statement['Action']).not.toContain('dynamodb:GetItem');
  });
});
