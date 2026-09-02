import {
  InternetGatewayService,
  NatGatewayService,
  SubnetService,
  VpcService,
} from '@infra-builder/state';
import type { AwsServiceDefinition } from '../index';

export const vpc: AwsServiceDefinition = {
  type: 'vpc',
  label: 'VPC',
  classDef: new VpcService(),
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
  ],
};

export const subnet: AwsServiceDefinition = {
  type: 'subnet',
  label: 'Subnet',
  classDef: new SubnetService(),
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
  ],
};

export const internetGateway: AwsServiceDefinition = {
  type: 'internet-gateway',
  label: 'Internet Gateway',
  classDef: new InternetGatewayService(),
  category: 'Networking',
  color: '#8C4FFF',
  iconPath: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a2 2 0 110 4 2 2 0 010-4z',
  defaultWidth: 140,
  defaultHeight: 80,
  defaultPorts: [
    { id: 'right', side: 'right', offset: 0.5 },
    { id: 'left', side: 'left', offset: 0.5 },
  ],
};

export const natGateway: AwsServiceDefinition = {
  type: 'nat-gateway',
  label: 'NAT Gateway',
  classDef: new NatGatewayService(),
  category: 'Networking',
  color: '#8C4FFF',
  iconPath:
    'M12 2a10 10 0 100 20 10 10 0 000-20zm-2 14l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z',
  defaultWidth: 140,
  defaultHeight: 80,
  defaultPorts: [
    { id: 'right', side: 'right', offset: 0.5 },
    { id: 'left', side: 'left', offset: 0.5 },
  ],
};

export const networkingServices = [vpc, subnet, internetGateway, natGateway];
