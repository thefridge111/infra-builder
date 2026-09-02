import { AwsServiceConfig, BaseAwsService } from '../base-aws-service';
import { AwsServiceType } from '../../../models';

export class VpcService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'vpc' as AwsServiceType,
      category: 'Networking',
      edgeRules: [
        { source: ['internet-gateway'], target: ['vpc'], kind: 'network' },
        { source: ['subnet'], target: ['vpc'], kind: 'attaches' },
      ],
      propertyFields: [
        { key: 'CidrBlock', label: 'CIDR block', placeholder: '10.0.0.0/16' },
      ],
    };

    super(config);
  }
}

export class SubnetService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'subnet' as AwsServiceType,
      category: 'Networking',
      edgeRules: [
        { source: ['vpc'], target: ['subnet'], kind: 'attaches' },
        { source: ['internet-gateway'], target: ['subnet'], kind: 'network' },
        { source: ['nat-gateway'], target: ['subnet'], kind: 'network' },
      ],
      propertyFields: [
        { key: 'CidrBlock', label: 'CIDR block', placeholder: '10.0.1.0/24' },
        {
          key: 'AvailabilityZone',
          label: 'Availability zone',
          placeholder: 'us-east-1a',
        },
      ],
    };

    super(config);
  }
}

export class InternetGatewayService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'internet-gateway' as AwsServiceType,
      category: 'Networking',
      edgeRules: [
        { source: ['internet-gateway'], target: ['vpc'], kind: 'network' },
        { source: ['internet-gateway'], target: ['subnet'], kind: 'network' },
      ],
      propertyFields: [],
    };

    super(config);
  }
}

export class NatGatewayService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'nat-gateway' as AwsServiceType,
      category: 'Networking',
      edgeRules: [
        { source: ['nat-gateway'], target: ['subnet'], kind: 'network' },
      ],
      propertyFields: [],
    };

    super(config);
  }
}

export const networkingServices = [
  new VpcService(),
  new SubnetService(),
  new InternetGatewayService(),
  new NatGatewayService(),
];
