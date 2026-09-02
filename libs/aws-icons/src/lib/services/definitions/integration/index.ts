import {
  ApiGatewayService,
  EventBridgeService,
  KinesisService,
  SnsService,
  SqsService,
} from '@infra-builder/state';
import type { AwsServiceDefinition } from '../index';

export const sqs: AwsServiceDefinition = {
  type: 'sqs',
  label: 'SQS',
  classDef: new SqsService(),
  category: 'Integration',
  color: '#FF4F8B',
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

export const sns: AwsServiceDefinition = {
  type: 'sns',
  label: 'SNS',
  classDef: new SnsService(),
  category: 'Integration',
  color: '#FF4F8B',
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

export const eventbridge: AwsServiceDefinition = {
  type: 'eventbridge',
  label: 'EventBridge',
  classDef: new EventBridgeService(),
  category: 'Integration',
  color: '#FF4F8B',
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

export const apiGateway: AwsServiceDefinition = {
  type: 'api-gateway',
  label: 'API Gateway',
  classDef: new ApiGatewayService(),
  category: 'Integration',
  color: '#FF4F8B',
  iconPath:
    'M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6 3-6 3-6-3 6-3zM4 9.4l7 3.5v7.2l-7-3.5V9.4zm9 10.7v-7.2l7-3.5v7.2l-7 3.5z',
  defaultWidth: 140,
  defaultHeight: 80,
  defaultPorts: [
    { id: 'left', side: 'left', offset: 0.5 },
    { id: 'right-top', side: 'right', offset: 0.3 },
    { id: 'right-bottom', side: 'right', offset: 0.7 },
  ],
};

export const kinesis: AwsServiceDefinition = {
  type: 'kinesis',
  label: 'Kinesis',
  classDef: new KinesisService(),
  category: 'Integration',
  color: '#FF4F8B',
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

export const integrationServices = [sqs, sns, eventbridge, apiGateway, kinesis];
