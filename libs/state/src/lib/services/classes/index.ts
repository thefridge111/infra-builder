import { BaseAwsService } from './base-aws-service';
import { networkingServices } from './networking';
import { computeServices } from './compute';
import { storageServices } from './storage';
import { databaseServices } from './database';
import { securityServices } from './security';
import { loadBalancingServices } from './load-balancing';
import { integrationServices } from './integration';

export const ALL_SERVICES: BaseAwsService[] = [
  ...networkingServices,
  ...computeServices,
  ...storageServices,
  ...databaseServices,
  ...securityServices,
  ...loadBalancingServices,
  ...integrationServices,
];

export const SERVICE_MAP = new Map<string, BaseAwsService>(
  ALL_SERVICES.map((s) => [s.type, s]),
);

export function getService(type?: string): BaseAwsService | undefined {
  if (!type) {
    return undefined;
  }

  return SERVICE_MAP.get(type);
}

export function getServicesByCategory(
  category: string,
  typeSearch = '',
): BaseAwsService[] {
  const services = ALL_SERVICES.filter((s) => {
    return (
      s.category === category &&
      (typeSearch === '' ||
        s.label.toLowerCase().includes(typeSearch.toLowerCase()))
    );
  });

  return services;
}

export function getAllCategories(): string[] {
  return [...new Set(ALL_SERVICES.map((s) => s.category))];
}

export * from './base-aws-service';
export * from './networking';
export * from './compute';
export * from './storage';
export * from './database';
export * from './security';
export * from './integration';
export * from './load-balancing';
export * from './base-aws-service';
