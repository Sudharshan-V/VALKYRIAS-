import { authenticatedRequest, publicRequest } from '../api';
import type { PortfolioItem } from '../types';

export const listPublicPortfolio = () => publicRequest<PortfolioItem[]>('/portfolio-items/public');

export const createPortfolioItem = (item: Omit<PortfolioItem, 'id'>) =>
  authenticatedRequest<PortfolioItem>('/portfolio-items', {
    method: 'POST',
    body: JSON.stringify({ ...item, published: true }),
  });

export const deletePortfolioItem = (id: string) =>
  authenticatedRequest<void>(`/portfolio-items/${encodeURIComponent(id)}`, { method: 'DELETE' });
