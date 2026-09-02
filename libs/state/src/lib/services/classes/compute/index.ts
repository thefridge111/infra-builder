import { AwsServiceType } from '../../../models';
import { AwsServiceConfig, BaseAwsService } from '../base-aws-service';

const DATA_SERVICES: AwsServiceType[] = [
  's3',
  'dynamodb',
  'rds',
  'sqs',
  'sns',
  'kinesis',
  'eventbridge',
];

export class Ec2Service extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'ec2' as AwsServiceType,
      category: 'Compute',
      edgeRules: [
        { source: ['ec2'], target: DATA_SERVICES, kind: 'depends-on' },
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
      category: 'Compute',
      edgeRules: [
        { source: ['lambda'], target: DATA_SERVICES, kind: 'depends-on' },
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
      category: 'Compute',
      edgeRules: [
        { source: ['ecs'], target: DATA_SERVICES, kind: 'depends-on' },
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
