import { DynamodbService, RdsService } from '@infra-builder/state';
import type { AwsServiceDefinition } from '../index';

export const rds: AwsServiceDefinition = {
  type: 'rds',
  label: 'RDS',
  classDef: new RdsService(),
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
  ],
};

export const dynamodb: AwsServiceDefinition = {
  type: 'dynamodb',
  label: 'DynamoDB',
  classDef: new DynamodbService(),
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
  ],
};

export const databaseServices = [rds, dynamodb];
