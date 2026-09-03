import { AwsServiceConfig, BaseAwsService } from '../base-aws-service';
import { AwsServiceType, Port } from '../../../models';

export class Ec2Service extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'ec2' as AwsServiceType,
      label: 'EC2',
      category: 'Compute',
      color: '#FF9900',
      iconPath: 'M4 4h16v12H4V4zm2 2v8h12V6H6zm2 10h8v2H8v-2z',
      defaultWidth: 120,
      defaultHeight: 90,
      defaultPorts: [
        { id: 'top', side: 'top', offset: 0.5 },
        { id: 'right', side: 'right', offset: 0.5 },
        { id: 'bottom', side: 'bottom', offset: 0.5 },
        { id: 'left', side: 'left', offset: 0.5 },
      ] as Port[],
      edgeRules: [
        {
          source: ['ec2'],
          target: [
            's3',
            'dynamodb',
            'rds',
            'sqs',
            'sns',
            'kinesis',
            'eventbridge',
          ],
          kind: 'depends-on',
        },
        {
          source: ['ec2'],
          target: ['ec2', 'lambda', 'ecs'],
          kind: 'depends-on',
        },
        { source: ['security-group'], target: ['ec2'], kind: 'attaches' },
        { source: ['iam-role'], target: ['ec2'], kind: 'attaches' },
        { source: ['ebs'], target: ['ec2'], kind: 'attaches' },
        { source: ['alb'], target: ['ec2'], kind: 'network' },
      ],
      propertyFields: [
        {
          key: 'InstanceType',
          label: 'Instance type',
          options: [
            't3.micro',
            't3.small',
            't3.medium',
            'm5.large',
            'c5.large',
          ],
        },
        { key: 'ImageId', label: 'AMI', placeholder: 'ami-...' },
      ],
    };

    super(config);
  }
}

export class LambdaService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'lambda' as AwsServiceType,
      label: 'Lambda',
      category: 'Compute',
      color: '#FF9900',
      iconPath: 'M13 2L3 14h6l-1 8 10-12h-6l1-8z',
      defaultWidth: 120,
      defaultHeight: 90,
      defaultPorts: [
        { id: 'top', side: 'top', offset: 0.5 },
        { id: 'right', side: 'right', offset: 0.5 },
        { id: 'bottom', side: 'bottom', offset: 0.5 },
        { id: 'left', side: 'left', offset: 0.5 },
      ] as Port[],
      edgeRules: [
        {
          source: ['lambda'],
          target: [
            's3',
            'dynamodb',
            'rds',
            'sqs',
            'sns',
            'kinesis',
            'eventbridge',
          ],
          kind: 'depends-on',
        },
        {
          source: ['lambda'],
          target: ['ec2', 'lambda', 'ecs'],
          kind: 'depends-on',
        },
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
        { source: ['iam-role'], target: ['lambda'], kind: 'attaches' },
        { source: ['security-group'], target: ['lambda'], kind: 'attaches' },
      ],
      propertyFields: [
        {
          key: 'Runtime',
          label: 'Runtime',
          options: ['nodejs22.x', 'nodejs20.x', 'python3.13', 'python3.12'],
        },
        { key: 'Handler', label: 'Handler', placeholder: 'index.handler' },
        { key: 'MemorySize', label: 'Memory (MB)', placeholder: '128' },
        { key: 'Timeout', label: 'Timeout (s)', placeholder: '3' },
      ],
    };

    super(config);
  }
}

export class EcsService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'ecs' as AwsServiceType,
      label: 'ECS',
      category: 'Compute',
      color: '#FF9900',
      iconPath:
        'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
      defaultWidth: 120,
      defaultHeight: 90,
      defaultPorts: [
        { id: 'top', side: 'top', offset: 0.5 },
        { id: 'right', side: 'right', offset: 0.5 },
        { id: 'bottom', side: 'bottom', offset: 0.5 },
        { id: 'left', side: 'left', offset: 0.5 },
      ] as Port[],
      edgeRules: [
        {
          source: ['ecs'],
          target: [
            's3',
            'dynamodb',
            'rds',
            'sqs',
            'sns',
            'kinesis',
            'eventbridge',
          ],
          kind: 'depends-on',
        },
        {
          source: ['ecs'],
          target: ['ec2', 'lambda', 'ecs'],
          kind: 'depends-on',
        },
        { source: ['iam-role'], target: ['ecs'], kind: 'attaches' },
        { source: ['security-group'], target: ['ecs'], kind: 'attaches' },
      ],
      propertyFields: [],
    };

    super(config);
  }
}

export const computeServices = [
  new Ec2Service(),
  new LambdaService(),
  new EcsService(),
];
