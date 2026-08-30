import { AwsServiceDefinition } from '@infra-builder/state';

export const sqs: AwsServiceDefinition = {
  type: 'sqs',
  label: 'SQS',
  category: 'Integration',
  color: '#E7157B',
  iconPath: 'M3 6h18v4H3V6zm0 6h18v4H3v-4zm0 6h12v2H3v-2z',
  defaultWidth: 120,
  defaultHeight: 90,
  defaultPorts: [
    { id: 'top', side: 'top', offset: 0.5 },
    { id: 'right', side: 'right', offset: 0.5 },
    { id: 'bottom', side: 'bottom', offset: 0.5 },
    { id: 'left', side: 'left', offset: 0.5 },
  ],
};

export const sns: AwsServiceDefinition = {
  type: 'sns',
  label: 'SNS',
  category: 'Integration',
  color: '#E7157B',
  iconPath: 'M12 3l9 6-9 6-9-6 9-6zm0 15l9-6v3l-9 6-9-6v-3l9 6z',
  defaultWidth: 120,
  defaultHeight: 90,
  defaultPorts: [
    { id: 'top', side: 'top', offset: 0.5 },
    { id: 'right', side: 'right', offset: 0.5 },
    { id: 'bottom', side: 'bottom', offset: 0.5 },
    { id: 'left', side: 'left', offset: 0.5 },
  ],
};

export const eventbridge: AwsServiceDefinition = {
  type: 'eventbridge',
  label: 'EventBridge',
  category: 'Integration',
  color: '#E7157B',
  iconPath: 'M4 12l4-4v3h8V8l4 4-4 4v-3H8v3l-4-4z',
  defaultWidth: 120,
  defaultHeight: 90,
  defaultPorts: [
    { id: 'top', side: 'top', offset: 0.5 },
    { id: 'right', side: 'right', offset: 0.5 },
    { id: 'bottom', side: 'bottom', offset: 0.5 },
    { id: 'left', side: 'left', offset: 0.5 },
  ],
};

export const apiGateway: AwsServiceDefinition = {
  type: 'api-gateway',
  label: 'API Gateway',
  category: 'Integration',
  color: '#E7157B',
  iconPath: 'M4 4h16v4H4V4zm0 6h7v10H4V10zm9 0h7v10h-7V10z',
  defaultWidth: 120,
  defaultHeight: 90,
  defaultPorts: [
    { id: 'top', side: 'top', offset: 0.5 },
    { id: 'right', side: 'right', offset: 0.5 },
    { id: 'bottom', side: 'bottom', offset: 0.5 },
    { id: 'left', side: 'left', offset: 0.5 },
  ],
};

export const kinesis: AwsServiceDefinition = {
  type: 'kinesis',
  label: 'Kinesis',
  category: 'Integration',
  color: '#8C4FFF',
  iconPath:
    'M3 8c3 0 3 4 6 4s3-4 6-4 3 4 6 4v2c-3 0-3-4-6-4s-3 4-6 4-3-4-6-4V8z',
  defaultWidth: 120,
  defaultHeight: 90,
  defaultPorts: [
    { id: 'top', side: 'top', offset: 0.5 },
    { id: 'right', side: 'right', offset: 0.5 },
    { id: 'bottom', side: 'bottom', offset: 0.5 },
    { id: 'left', side: 'left', offset: 0.5 },
  ],
};

export const integrationServices = [sqs, sns, eventbridge, apiGateway, kinesis];
