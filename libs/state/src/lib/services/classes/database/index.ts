import { AwsServiceConfig, BaseAwsService } from '../base-aws-service';
import { AwsServiceType, Port, EdgeKind, EdgeKindLabel } from '../../../models';

export class RdsService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'rds' as AwsServiceType,
      label: 'RDS',
      category: 'Database',
      color: '#C925D1',
      iconPath:
        'M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2zm0 2c4.42 0 8 1.57 8 3.5S16.42 11 12 11 4 9.43 4 7.5 7.58 4 12 4zm0 14c-4.42 0-8-1.57-8-3.5v-2.33C5.14 13.08 8.39 14 12 14s6.86-.92 8-1.83V16.5c0 1.93-3.58 3.5-8 3.5zm0-6c-4.42 0-8-1.57-8-3.5v-2.33C5.14 9.08 8.39 10 12 10s6.86-.92 8-1.83v2.33c0 1.93-3.58 3.5-8 3.5z',
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
          source: ['lambda', 'ec2', 'ecs'],
          target: ['rds'],
          kind: EdgeKind.dependsOn,
          label: EdgeKindLabel[EdgeKind.dependsOn],
        },
        {
          source: ['security-group'],
          target: ['rds'],
          kind: EdgeKind.attaches,
          label: EdgeKindLabel[EdgeKind.attaches],
        },
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

export class DynamodbService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'dynamodb' as AwsServiceType,
      label: 'DynamoDB',
      category: 'Database',
      color: '#C925D1',
      iconPath:
        'M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6 3-6 3-6-3 6-3zM4 9.4l7 3.5v7.2l-7-3.5V9.4zm9 10.7v-7.2l7-3.5v7.2l-7 3.5z',
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
          source: ['lambda', 'ec2', 'ecs'],
          target: ['dynamodb'],
          kind: EdgeKind.dependsOn,
          label: EdgeKindLabel[EdgeKind.dependsOn],
        },
        {
          source: ['dynamodb'],
          target: ['lambda'],
          kind: EdgeKind.trigger,
          label: EdgeKindLabel[EdgeKind.trigger],
        },
      ],
      propertyFields: [
        { key: 'TableName', label: 'Table name', placeholder: 'optional' },
        {
          key: 'BillingMode',
          label: 'Billing',
          options: ['PAY_PER_REQUEST', 'PROVISIONED'],
        },
      ],
    };

    super(config);
  }
}

export const databaseServices = [new RdsService(), new DynamodbService()];
