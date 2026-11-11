import { apiRequest } from './apiClient.js';
import { todayISO } from '../utils/helpers.js';

export const reportesService = {
  async getDashboard() {
    const query = new URLSearchParams({ fecha: todayISO() });
    return apiRequest(`/reportes/dashboard?${query.toString()}`);
  },

  async exportReporte() {
    return apiRequest('/reportes/exportar');
  },
};
