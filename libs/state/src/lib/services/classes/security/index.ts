import { AwsServiceConfig, BaseAwsService } from '../base-aws-service';
import { AwsServiceType, Port } from '../../../models';

export class IamRoleService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'iam-role' as AwsServiceType,
      label: 'IAM Role',
      category: 'Security',
      color: '#DD344C',
      iconPath:
        'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z',
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
          source: ['iam-role'],
          target: ['ec2', 'lambda', 'ecs'],
          kind: 'attaches',
        },
      ],
      propertyFields: [],
    };

    super(config);
  }
}

export class SecurityGroupService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'security-group' as AwsServiceType,
      label: 'Security Group',
      category: 'Security',
      color: '#DD344C',
      iconPath:
        'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l6 2.67v5.15c0 4.38-2.77 8.5-6 9.68-3.23-1.18-6-5.3-6-9.68V5.85l6-2.67z',
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
          source: ['security-group'],
          target: ['ec2', 'lambda', 'ecs', 'rds', 'alb'],
          kind: 'attaches',
        },
        {
          source: ['security-group'],
          target: ['security-group'],
          kind: 'network',
        },
      ],
      propertyFields: [{ key: 'GroupDescription', label: 'Description' }],
    };

    super(config);
  }
}

export const securityServices = [
  new IamRoleService(),
  new SecurityGroupService(),
];
