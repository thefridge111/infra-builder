import { AwsServiceConfig, BaseAwsService } from '../base-aws-service';
import { AwsServiceType } from '../../../models';

export class SqsService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'sqs' as AwsServiceType,
      category: 'Integration',
      edgeRules: [
        {
          source: ['lambda', 'ec2', 'ecs'],
          target: ['rds'],
          kind: 'depends-on',
        },
        { source: ['security-group'], target: ['rds'], kind: 'attaches' },
      ],
      propertyFields: [
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
    };

    super(config);
  }
}

export class SnsService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'sns' as AwsServiceType,
      category: 'Integration',
      edgeRules: [
        {
          source: ['lambda', 'ec2', 'ecs'],
          target: ['rds'],
          kind: 'depends-on',
        },
        { source: ['security-group'], target: ['rds'], kind: 'attaches' },
      ],
      propertyFields: [
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
    };

    super(config);
  }
}

export class EventBridgeService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'sqs' as AwsServiceType,
      category: 'Integration',
      edgeRules: [
        {
          source: ['lambda', 'ec2', 'ecs'],
          target: ['rds'],
          kind: 'depends-on',
        },
        { source: ['security-group'], target: ['rds'], kind: 'attaches' },
      ],
      propertyFields: [
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
    };

    super(config);
  }
}

export class ApiGatewayService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'sqs' as AwsServiceType,
      category: 'Integration',
      edgeRules: [
        {
          source: ['lambda', 'ec2', 'ecs'],
          target: ['rds'],
          kind: 'depends-on',
        },
        { source: ['security-group'], target: ['rds'], kind: 'attaches' },
      ],
      propertyFields: [
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
    };

    super(config);
  }
}

export class KinesisService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'sqs' as AwsServiceType,
      category: 'Integration',
      edgeRules: [
        {
          source: ['lambda', 'ec2', 'ecs'],
          target: ['rds'],
          kind: 'depends-on',
        },
        { source: ['security-group'], target: ['rds'], kind: 'attaches' },
      ],
      propertyFields: [
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
    };

    super(config);
  }
}

export const integrationServices = [
  new SqsService(),
  new SnsService(),
  new EventBridgeService(),
  new ApiGatewayService(),
  new KinesisService(),
];
