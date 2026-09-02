import { AwsServiceConfig, BaseAwsService } from '../base-aws-service';
import { AwsServiceType } from '../../../models';
export class RdsService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'rds' as AwsServiceType,
      category: 'Database',
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

export class DynamodbService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'dynamodb' as AwsServiceType,
      category: 'Database',
      edgeRules: [
        {
          source: ['lambda', 'ec2', 'ecs'],
          target: ['dynamodb'],
          kind: 'depends-on',
        },
        { source: ['dynamodb'], target: ['lambda'], kind: 'trigger' },
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
