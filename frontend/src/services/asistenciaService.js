import { apiRequest } from './apiClient.js';

function getHoursWorked(record) {
  if (!record.horaEntrada || !record.horaSalida) return '';
  const [entryHour, entryMinute] = record.horaEntrada.split(':').map(Number);
  const [exitHour, exitMinute] = record.horaSalida.split(':').map(Number);
  let minutes = exitHour * 60 + exitMinute - (entryHour * 60 + entryMinute);
  if (minutes < 0) minutes += 24 * 60;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes < 10 ? '0' : ''}${remainingMinutes}m`;
}

export const asistenciaService = {
  async getToday(fecha) {
    const query = new URLSearchParams({ fecha });
    return apiRequest(`/asistencias?${query.toString()}`);
  },

  async marcar(trabajadorId, tipo, fecha) {
    return apiRequest('/asistencias/marcar', {
      method: 'POST',
      body: { trabajadorId, tipo, fecha },
    });
  },

  async corregirRegistro(registroId, campo, hora) {
    return apiRequest(`/asistencias/${encodeURIComponent(registroId)}/hora`, {
      method: 'PATCH',
      body: { campo, hora },
    });
  },

  async deshacerRegistro(registroId, campo) {
    return this.corregirRegistro(registroId, campo, null);
  },

  async eliminarRegistro(registroId) {
    return apiRequest(`/asistencias/${encodeURIComponent(registroId)}`, {
      method: 'DELETE',
    });
  },

  async getResumenHoy(fecha) {
    const query = new URLSearchParams({ fecha });
    return apiRequest(`/asistencias/resumen?${query.toString()}`);
  },

  async getPagosEstimados({ desde, hasta } = {}) {
    const query = new URLSearchParams();
    if (desde) query.set('desde', desde);
    if (hasta) query.set('hasta', hasta);
    const suffix = query.size ? `?${query.toString()}` : '';
    return apiRequest(`/asistencias/pagos${suffix}`);
  },

  async exportPagos() {
    const { pagos } = await this.getPagosEstimados();
    return pagos.map((payment) => ({
      Trabajador: `${payment.trabajador.nombres} ${payment.trabajador.apellidos}`,
      DNI: payment.trabajador.dni,
      Cargo: payment.cargo,
      SalarioBase: `S/ ${payment.salarioBase.toFixed(2)}`,
      TarifaHora: `S/ ${payment.tarifaHora.toFixed(2)}`,
      HorasAcumuladas: payment.horasAcumuladas.toFixed(2),
      DiasRegistrados: payment.diasRegistrados,
      PagoEstimado: `S/ ${payment.pagoEstimado.toFixed(2)}`,
    }));
  },

  async getHistorial({ desde, hasta, q } = {}) {
    const query = new URLSearchParams();
    if (desde) query.set('desde', desde);
    if (hasta) query.set('hasta', hasta);
    if (q?.trim()) query.set('q', q.trim());
    const suffix = query.size ? `?${query.toString()}` : '';
    return apiRequest(`/asistencias/historial${suffix}`);
  },

  async exportHistorial(filtros = {}) {
    const registros = await this.getHistorial(filtros);
    return registros.map((record) => {
      const trabajador = record.trabajador;
      return {
        Fecha: record.fecha,
        Trabajador: trabajador ? `${trabajador.nombres} ${trabajador.apellidos}` : '—',
        DNI: trabajador?.dni || '—',
        Cargo: trabajador?.cargo || '—',
        Entrada: record.horaEntrada || '—',
        Salida: record.horaSalida || '—',
        Horas: getHoursWorked(record) || '—',
        Estado: !record.horaEntrada ? 'Sin entrada' : !record.horaSalida ? 'En planta' : 'Completo',
      };
    });
  },
};
