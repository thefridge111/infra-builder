import { AwsServiceConfig, BaseAwsService } from '../base-aws-service';
import { AwsServiceType, Port, EdgeKind, EdgeKindLabel } from '../../../models';

export class S3Service extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 's3' as AwsServiceType,
      label: 'S3',
      category: 'Storage',
      color: '#3F8624',
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
          source: ['s3'],
          target: ['lambda'],
          kind: EdgeKind.trigger,
          label: EdgeKindLabel[EdgeKind.trigger],
        },
        {
          source: ['s3'],
          target: ['sqs'],
          kind: EdgeKind.trigger,
          label: EdgeKindLabel[EdgeKind.trigger],
        },
        {
          source: ['s3'],
          target: ['sns'],
          kind: EdgeKind.trigger,
          label: EdgeKindLabel[EdgeKind.trigger],
        },
        {
          source: ['s3'],
          target: ['eventbridge'],
          kind: EdgeKind.trigger,
          label: EdgeKindLabel[EdgeKind.trigger],
        },
        {
          source: ['lambda', 'ec2', 'ecs'],
          target: ['s3'],
          kind: EdgeKind.dependsOn,
          label: EdgeKindLabel[EdgeKind.dependsOn],
        },
      ],
      propertyFields: [
        { key: 'BucketName', label: 'Bucket name', placeholder: 'optional' },
      ],
    };

    super(config);
  }
}

export class EbsService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'ebs' as AwsServiceType,
      label: 'EBS',
      category: 'Storage',
      color: '#3F8624',
      iconPath: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm3 3h6v6H9V9z',
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
          source: ['ebs'],
          target: ['ec2'],
          kind: EdgeKind.attaches,
          label: EdgeKindLabel[EdgeKind.attaches],
        },
      ],
      propertyFields: [{ key: 'Size', label: 'Size (GB)', placeholder: '8' }],
    };

    super(config);
  }
}

export const storageServices = [new S3Service(), new EbsService()];
