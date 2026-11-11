import { apiRequest } from './apiClient.js';

export const trabajadoresService = {
  async getAll() {
    return apiRequest('/trabajadores');
  },

  async getById(id) {
    return apiRequest(`/trabajadores/${encodeURIComponent(id)}`);
  },

  async search(query = '') {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    const suffix = params.size ? `?${params.toString()}` : '';
    return apiRequest(`/trabajadores${suffix}`);
  },

  async create(data) {
    return apiRequest('/trabajadores', { method: 'POST', body: data });
  },

  async update(id, data) {
    return apiRequest(`/trabajadores/${encodeURIComponent(id)}`, { method: 'PATCH', body: data });
  },

  async remove(id) {
    return apiRequest(`/trabajadores/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
