import { authenticatedRequest, publicRequest } from '../api';
import type { ServicePackageResponse, ServiceResponse } from '../types';

export const listServices = () => publicRequest<ServiceResponse[]>('/services');

export const createService = (request: unknown) => authenticatedRequest<ServiceResponse>('/services', {
  method: 'POST', body: JSON.stringify(request),
});

export const addServicePackage = (serviceId: string, request: unknown) =>
  authenticatedRequest<ServicePackageResponse>(`/services/${encodeURIComponent(serviceId)}/packages`, {
    method: 'POST', body: JSON.stringify(request),
  });

export const updateServicePackage = (packageId: string, request: unknown) =>
  authenticatedRequest<ServicePackageResponse>(`/services/packages/${encodeURIComponent(packageId)}`, {
    method: 'PUT', body: JSON.stringify(request),
  });
