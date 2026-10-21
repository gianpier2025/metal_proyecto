import { store } from '../utils/Store.js';
import {
  calcularHorasTrabajador,
  calcularTarifaHora,
  HORAS_MENSUALES,
} from '../utils/helpers.js';

function delay(data, ms = 250) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

export const asistenciaService = {
  async getToday(fecha) {
    const registros = store.getAsistenciaHoy(fecha);
    const { trabajadores } = store.get();
    return delay(
      registros.map((r) => ({
        ...r,
        trabajador: trabajadores.find((t) => t.id === r.trabajadorId),
      }))
    );
  },

  async marcar(trabajadorId, tipo, fecha) {
    store.registrarAsistencia(trabajadorId, tipo, fecha);
    return delay({ success: true });
  },

  async corregirRegistro(registroId, campo, hora) {
    store.corregirAsistencia(registroId, campo, hora);
    return delay({ success: true });
  },

  async deshacerRegistro(registroId, campo) {
    store.deshacerAsistencia(registroId, campo);
    return delay({ success: true });
  },

  async eliminarRegistro(registroId) {
    store.eliminarRegistroAsistencia(registroId);
    return delay({ success: true });
  },

  async getResumenHoy(fecha) {
    const registros = store.getAsistenciaHoy(fecha);
    const { trabajadores } = store.get();
    const activos = trabajadores.filter((t) => t.estado === 'Activo');
    const activosIds = new Set(activos.map((t) => t.id));
    const registrosActivos = registros.filter((r) => activosIds.has(r.trabajadorId));
    const presentes = registrosActivos.length;
    const conSalida = registrosActivos.filter((r) => r.horaSalida).length;
    const puntual = registrosActivos.filter((r) => r.horaEntrada && r.horaEntrada <= '07:15').length;

    return delay({
      totalActivos: activos.length,
      presentes,
      conSalida,
      puntual: presentes > 0 ? Math.round((puntual / presentes) * 100) : 0,
      faltantes: Math.max(0, activos.length - presentes),
    });
  },

  async getPagosEstimados() {
    const { trabajadores, asistencia } = store.get();
    const activos = trabajadores.filter((t) => t.estado === 'Activo');

    const pagos = activos.map((t) => {
      const horas = calcularHorasTrabajador(asistencia, t.id);
      const tarifaHora = calcularTarifaHora(t.salarioBase, t.tarifaPorHora);
      const pagoEstimado = horas * tarifaHora;
      const registros = asistencia.filter(
        (a) => a.trabajadorId === t.id && a.horaEntrada && a.horaSalida
      ).length;
      return {
        trabajador: t,
        cargo: t.cargo,
        salarioBase: t.salarioBase,
        tarifaHora,
        horasAcumuladas: horas,
        pagoEstimado,
        diasRegistrados: registros,
      };
    });

    const totalHoras = pagos.reduce((acc, p) => acc + p.horasAcumuladas, 0);
    const totalPago = pagos.reduce((acc, p) => acc + p.pagoEstimado, 0);
    const totalSalarios = pagos.reduce((acc, p) => acc + p.salarioBase, 0);

    return delay({
      pagos,
      totales: {
        totalHoras,
        totalPago,
        totalSalarios,
        cantidadTrabajadores: pagos.length,
      },
    });
  },

  async exportPagos() {
    const { pagos } = await this.getPagosEstimados();
    return delay(
      pagos.map((p) => ({
        Trabajador: p.trabajador.nombres + ' ' + p.trabajador.apellidos,
        DNI: p.trabajador.dni,
        Cargo: p.cargo,
        SalarioBase: 'S/ ' + p.salarioBase.toFixed(2),
        TarifaHora: 'S/ ' + p.tarifaHora.toFixed(2),
        HorasAcumuladas: p.horasAcumuladas.toFixed(2),
        DiasRegistrados: p.diasRegistrados,
        PagoEstimado: 'S/ ' + p.pagoEstimado.toFixed(2),
      }))
    );
  },
};
