import { AwsServiceDefinition } from '@infra-builder/state';

export const alb: AwsServiceDefinition = {
  type: 'alb',
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
  ],
};

export const loadBalancingServices = [alb];
