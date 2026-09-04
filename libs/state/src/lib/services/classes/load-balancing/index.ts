import { AwsServiceConfig, BaseAwsService } from '../base-aws-service';
import { AwsServiceType, Port, EdgeKind, EdgeKindLabel } from '../../../models';

export class AlbService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'alb' as AwsServiceType,
      label: 'ALB',
      category: 'Load Balancing',
      color: '#8C4FFF',
      iconPath: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
      defaultWidth: 160,
      defaultHeight: 80,
      defaultPorts: [
        { id: 'left', side: 'left', offset: 0.5 },
        { id: 'right-top', side: 'right', offset: 0.3 },
        { id: 'right-bottom', side: 'right', offset: 0.7 },
      ] as Port[],
      edgeRules: [
        {
          source: ['alb'],
          target: ['ec2', 'lambda'],
          kind: EdgeKind.network,
          label: EdgeKindLabel[EdgeKind.network],
        },
        {
          source: ['security-group'],
          target: ['alb'],
          kind: EdgeKind.attaches,
          label: EdgeKindLabel[EdgeKind.attaches],
        },
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
