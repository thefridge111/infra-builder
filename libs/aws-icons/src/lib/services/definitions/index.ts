import { AwsServiceDefinition } from '@infra-builder/state';
import { networkingServices } from './networking';
import { computeServices } from './compute';
import { storageServices } from './storage';
import { databaseServices } from './database';
import { securityServices } from './security';
import { loadBalancingServices } from './load-balancing';
import { integrationServices } from './integration';

export const AWS_SERVICES: AwsServiceDefinition[] = [
  ...networkingServices,
  ...computeServices,
  ...storageServices,
  ...databaseServices,
  ...securityServices,
  ...loadBalancingServices,
  ...integrationServices,
];

export const AWS_CATEGORIES = [...new Set(AWS_SERVICES.map((s) => s.category))];

export const AWS_SERVICE_MAP = new Map(AWS_SERVICES.map((s) => [s.type, s]));

// Re-export individual services for direct imports
export * from './networking';
export * from './compute';
export * from './storage';
export * from './database';
export * from './security';
export * from './load-balancing';
export * from './integration';
