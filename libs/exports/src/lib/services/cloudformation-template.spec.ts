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
