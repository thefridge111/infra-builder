import { AwsServiceConfig, BaseAwsService } from '../base-aws-service';
import { AwsServiceType } from '../../../models';

export class IamRoleService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'iam-role' as AwsServiceType,
      category: 'Security',
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
      category: 'Security',
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
