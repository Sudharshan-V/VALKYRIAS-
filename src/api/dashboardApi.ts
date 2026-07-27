import { authenticatedRequest } from '../api';
import type { AdminDashboardResponse, PortalDashboardResponse } from '../types';

export const getClientDashboard = () => authenticatedRequest<PortalDashboardResponse>('/client/dashboard');
export const getEditorDashboard = () => authenticatedRequest<PortalDashboardResponse>('/editor/dashboard');
export const getAdminDashboard = () => authenticatedRequest<AdminDashboardResponse>('/admin/dashboard');
