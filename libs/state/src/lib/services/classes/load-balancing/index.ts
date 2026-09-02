import { AwsServiceConfig, BaseAwsService } from '../base-aws-service';
import { AwsServiceType } from '../../../models';

export class AlbService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'alb' as AwsServiceType,
      category: 'Load Balancing',
      edgeRules: [
        { source: ['alb'], target: ['ec2', 'lambda'], kind: 'network' },
        { source: ['security-group'], target: ['alb'], kind: 'attaches' },
      ],
      propertyFields: [
        {
          key: 'Scheme',
          label: 'Scheme',
          options: ['internet-facing', 'internal'],
        },
      ],
    };

    super(config);
  }
}

export const loadBalancingServices = [new AlbService()];
