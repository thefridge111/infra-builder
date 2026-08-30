import { AwsServiceDefinition } from '@infra-builder/state';

export const ec2: AwsServiceDefinition = {
  type: 'ec2',
  label: 'EC2',
  category: 'Compute',
  color: '#FF9900',
  iconPath: 'M4 4h16v12H4V4zm2 2v8h12V6H6zm2 10h8v2H8v-2z',
  defaultWidth: 120,
  defaultHeight: 90,
  defaultPorts: [
    { id: 'top', side: 'top', offset: 0.5 },
    { id: 'right', side: 'right', offset: 0.5 },
    { id: 'bottom', side: 'bottom', offset: 0.5 },
    { id: 'left', side: 'left', offset: 0.5 },
  ],
};

export const lambda: AwsServiceDefinition = {
  type: 'lambda',
  label: 'Lambda',
  category: 'Compute',
  color: '#FF9900',
  iconPath: 'M13 2L3 14h6l-1 8 10-12h-6l1-8z',
  defaultWidth: 120,
  defaultHeight: 90,
  defaultPorts: [
    { id: 'top', side: 'top', offset: 0.5 },
    { id: 'right', side: 'right', offset: 0.5 },
    { id: 'bottom', side: 'bottom', offset: 0.5 },
    { id: 'left', side: 'left', offset: 0.5 },
  ],
};

export const ecs: AwsServiceDefinition = {
  type: 'ecs',
  label: 'ECS',
  category: 'Compute',
  color: '#FF9900',
  iconPath:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
  defaultWidth: 120,
  defaultHeight: 90,
  defaultPorts: [
    { id: 'top', side: 'top', offset: 0.5 },
    { id: 'right', side: 'right', offset: 0.5 },
    { id: 'bottom', side: 'bottom', offset: 0.5 },
    { id: 'left', side: 'left', offset: 0.5 },
  ],
};

export const computeServices = [ec2, lambda, ecs];
