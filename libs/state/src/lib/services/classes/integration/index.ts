import { AwsServiceConfig, BaseAwsService } from '../base-aws-service';
import { AwsServiceType, Port } from '../../../models';

export class SqsService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'sqs' as AwsServiceType,
      label: 'SQS',
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
      ] as Port[],
      edgeRules: [
        {
          source: ['s3', 'sns', 'eventbridge'],
          target: ['sqs'],
          kind: 'trigger',
        },
        {
          source: ['lambda', 'ec2', 'ecs'],
          target: ['sqs'],
          kind: 'depends-on',
        },
      ],
      propertyFields: [
        { key: 'QueueName', label: 'Queue name', placeholder: 'optional' },
        {
          key: 'VisibilityTimeout',
          label: 'Visibility timeout (s)',
          placeholder: '30',
        },
      ],
    };

    super(config);
  }
}

export class SnsService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'sns' as AwsServiceType,
      label: 'SNS',
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
      ] as Port[],
      edgeRules: [
        { source: ['s3', 'eventbridge'], target: ['sns'], kind: 'trigger' },
        {
          source: ['lambda', 'ec2', 'ecs'],
          target: ['sns'],
          kind: 'depends-on',
        },
      ],
      propertyFields: [
        { key: 'TopicName', label: 'Topic name', placeholder: 'optional' },
      ],
    };

    super(config);
  }
}

export class EventBridgeService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'eventbridge' as AwsServiceType,
      label: 'EventBridge',
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
      ] as Port[],
      edgeRules: [
        { source: ['s3'], target: ['eventbridge'], kind: 'trigger' },
        {
          source: ['eventbridge'],
          target: ['lambda', 'sqs', 'sns'],
          kind: 'trigger',
        },
        {
          source: ['lambda', 'ec2', 'ecs'],
          target: ['eventbridge'],
          kind: 'depends-on',
        },
      ],
      propertyFields: [
        {
          key: 'ScheduleExpression',
          label: 'Schedule',
          placeholder: 'rate(5 minutes)',
        },
      ],
    };

    super(config);
  }
}

export class ApiGatewayService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'api-gateway' as AwsServiceType,
      label: 'API Gateway',
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
      ] as Port[],
      edgeRules: [
        { source: ['api-gateway'], target: ['lambda'], kind: 'trigger' },
        {
          source: ['lambda', 'ec2', 'ecs'],
          target: ['api-gateway'],
          kind: 'depends-on',
        },
      ],
      propertyFields: [
        { key: 'RouteKey', label: 'Route', placeholder: 'GET /items' },
        {
          key: 'Name',
          label: 'API name',
          placeholder: 'defaults to node name',
        },
      ],
    };

    super(config);
  }
}

export class KinesisService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'kinesis' as AwsServiceType,
      label: 'Kinesis',
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
      ] as Port[],
      edgeRules: [
        { source: ['kinesis'], target: ['lambda'], kind: 'trigger' },
        {
          source: ['lambda', 'ec2', 'ecs'],
          target: ['kinesis'],
          kind: 'depends-on',
        },
      ],
      propertyFields: [
        { key: 'ShardCount', label: 'Shards', placeholder: '1' },
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
