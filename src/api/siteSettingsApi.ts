import { authenticatedRequest, publicRequest } from '../api';
import type { SiteSettings } from '../types';

export const getPublicSiteSettings = () => publicRequest<SiteSettings>('/site-settings/public');

export const updateSiteSettings = (settings: SiteSettings) =>
  authenticatedRequest<SiteSettings>('/site-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
