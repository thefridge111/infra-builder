import { AwsServiceConfig, BaseAwsService } from '../base-aws-service';
import { AwsServiceType, Port } from '../../../models';

export class VpcService extends BaseAwsService {
  constructor() {
    const config: AwsServiceConfig = {
      type: 'vpc' as AwsServiceType,
      label: 'VPC',
      category: 'Networking',
      color: '#8C4FFF',
      iconPath: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
      defaultWidth: 200,
      defaultHeight: 140,
      defaultPorts: [
        { id: 'top', side: 'top', offset: 0.5 },
        { id: 'right', side: 'right', offset: 0.5 },
        { id: 'bottom', side: 'bottom', offset: 0.5 },
        { id: 'left', side: 'left', offset: 0.5 },
      ] as Port[],
      container: true,
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
      label: 'Subnet',
      category: 'Networking',
      color: '#8C4FFF',
      iconPath: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
      defaultWidth: 160,
      defaultHeight: 100,
      defaultPorts: [
        { id: 'top', side: 'top', offset: 0.5 },
        { id: 'right', side: 'right', offset: 0.5 },
        { id: 'bottom', side: 'bottom', offset: 0.5 },
        { id: 'left', side: 'left', offset: 0.5 },
      ] as Port[],
      container: true,
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
      label: 'Internet Gateway',
      category: 'Networking',
      color: '#8C4FFF',
      iconPath:
        'M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a2 2 0 110 4 2 2 0 010-4z',
      defaultWidth: 140,
      defaultHeight: 80,
      defaultPorts: [
        { id: 'right', side: 'right', offset: 0.5 },
        { id: 'left', side: 'left', offset: 0.5 },
      ] as Port[],
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
      label: 'NAT Gateway',
      category: 'Networking',
      color: '#8C4FFF',
      iconPath:
        'M12 2a10 10 0 100 20 10 10 0 000-20zm-2 14l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z',
      defaultWidth: 140,
      defaultHeight: 80,
      defaultPorts: [
        { id: 'right', side: 'right', offset: 0.5 },
        { id: 'left', side: 'left', offset: 0.5 },
      ] as Port[],
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
