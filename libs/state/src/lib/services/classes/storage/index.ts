import { AwsServiceConfig, BaseAwsService } from '../base-aws-service';
import { AwsServiceType } from '../../../models';

export class S3Service extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 's3' as AwsServiceType,
      category: 'Storage',
      edgeRules: [
        { source: ['s3'], target: ['lambda'], kind: 'trigger' },
        { source: ['s3'], target: ['sqs'], kind: 'trigger' },
        { source: ['s3'], target: ['sns'], kind: 'trigger' },
        { source: ['s3'], target: ['eventbridge'], kind: 'trigger' },
        {
          source: ['lambda', 'ec2', 'ecs'],
          target: ['s3'],
          kind: 'depends-on',
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
      category: 'Storage',
      edgeRules: [{ source: ['ebs'], target: ['ec2'], kind: 'attaches' }],
      propertyFields: [{ key: 'Size', label: 'Size (GB)', placeholder: '8' }],
    };

    super(config);
  }
}

export const storageServices = [new S3Service(), new EbsService()];
