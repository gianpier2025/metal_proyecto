import { apiRequest } from './apiClient.js';

const ROLES = ['admin', 'rrhh', 'supervisor', 'consulta'];

export const usuariosService = {
  async getAll() {
    return apiRequest('/usuarios');
  },

  async invite(data) {
    return apiRequest('/usuarios/invitar', { method: 'POST', body: data });
  },

  async update(id, updates) {
    if (!ROLES.includes(updates.rol)) throw new Error('Seleccione un rol válido');
    return apiRequest(`/usuarios/${encodeURIComponent(id)}`, { method: 'PATCH', body: updates });
  },
};
