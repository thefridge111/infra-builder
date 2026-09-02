import { EbsService, S3Service } from '@infra-builder/state';
import type { AwsServiceDefinition } from '../index';

export const s3: AwsServiceDefinition = {
  type: 's3',
  label: 'S3',
  classDef: new S3Service(),
  category: 'Storage',
  color: '#3F8624',
  iconPath:
    'M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6 3-6 3-6-3 6-3zM4 9.4l7 3.5v7.2l-7-3.5V9.4zm9 10.7v-7.2l7-3.5v7.2l-7 3.5z',
  defaultWidth: 120,
  defaultHeight: 90,
  defaultPorts: [
    { id: 'top', side: 'top', offset: 0.5 },
    { id: 'right', side: 'right', offset: 0.5 },
    { id: 'bottom', side: 'bottom', offset: 0.5 },
    { id: 'left', side: 'left', offset: 0.5 },
  ],
};

export const ebs: AwsServiceDefinition = {
  type: 'ebs',
  label: 'EBS',
  classDef: new EbsService(),
  category: 'Storage',
  color: '#3F8624',
  iconPath: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm3 3h6v6H9V9z',
  defaultWidth: 120,
  defaultHeight: 90,
  defaultPorts: [
    { id: 'top', side: 'top', offset: 0.5 },
    { id: 'right', side: 'right', offset: 0.5 },
    { id: 'bottom', side: 'bottom', offset: 0.5 },
    { id: 'left', side: 'left', offset: 0.5 },
  ],
};

export const storageServices = [s3, ebs];
