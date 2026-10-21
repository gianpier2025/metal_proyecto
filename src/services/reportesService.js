import { store } from '../utils/Store.js';
import { calcularEstadoDocumento, calcularDiasRestantes } from '../utils/helpers.js';

function delay(data, ms = 250) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

export const reportesService = {
  async getDashboard() {
    const { trabajadores, documentos, asistencia } = store.get();
    const activos = trabajadores.filter((t) => t.estado === 'Activo');
    const activosIds = new Set(activos.map((t) => t.id));
    const total = trabajadores.length;

    const today = new Date().toISOString().split('T')[0];
    const asistenciaHoy = asistencia.filter(
      (a) => a.fecha === today && activosIds.has(a.trabajadorId)
    );
    const puntual = asistenciaHoy.filter((a) => a.horaEntrada && a.horaEntrada <= '07:15').length;
    const puntualidad = asistenciaHoy.length > 0 ? Math.round((puntual / asistenciaHoy.length) * 100) : 0;

    const contratosConEstado = documentos.map((d) => {
      const t = trabajadores.find((tr) => tr.id === d.trabajadorId);
      const estadoKey = d.nombreArchivo
        ? calcularEstadoDocumento(d.fechaVencimiento)
        : 'SIN_PDF';
      return {
        ...d,
        trabajador: t,
        estadoKey,
        diasRestantes: calcularDiasRestantes(d.fechaVencimiento),
      };
    });

    const vencidos = contratosConEstado.filter((d) => d.estadoKey === 'VENCIDO').length;
    const porVencer = contratosConEstado.filter((d) => d.estadoKey === 'POR_VENCER').length;
    const sinPdf = contratosConEstado.filter((d) => d.estadoKey === 'SIN_PDF').length;
    const vigentes = contratosConEstado.filter((d) => d.estadoKey === 'AL_DIA').length;

    const alertasContratos = contratosConEstado
      .filter((d) => d.estadoKey === 'VENCIDO' || d.estadoKey === 'POR_VENCER')
      .sort((a, b) => {
        const da = a.diasRestantes != null ? a.diasRestantes : 9999;
        const db = b.diasRestantes != null ? b.diasRestantes : 9999;
        return da - db;
      })
      .slice(0, 5);

    return delay({
      totalTrabajadores: total,
      trabajadoresActivos: activos.length,
      trabajadoresInactivos: total - activos.length,
      puntualidadHoy: puntualidad,
      presentesHoy: asistenciaHoy.length,
      contratosVencidos: vencidos,
      contratosPorVencer: porVencer,
      contratosSinPdf: sinPdf,
      contratosVigentes: vigentes,
      alertasContratos,
    });
  },

  async exportReporte() {
    const { trabajadores, documentos } = store.get();
    const data = trabajadores.map((t) => {
      const contrato = documentos.find((d) => d.trabajadorId === t.id);
      const dias = contrato ? calcularDiasRestantes(contrato.fechaVencimiento) : null;
      let estadoContrato = 'Sin PDF';
      if (contrato && contrato.nombreArchivo) {
        if (dias == null) estadoContrato = 'Sin fecha';
        else if (dias < 0) estadoContrato = 'Vencido';
        else if (dias <= 30) estadoContrato = 'Por vencer';
        else estadoContrato = 'Vigente';
      }
      return {
        Nombres: t.nombres + ' ' + t.apellidos,
        DNI: t.dni,
        Cargo: t.cargo,
        Estado: t.estado,
        SalarioBase: t.salarioBase || 0,
        TarifaPorHora: t.tarifaPorHora || 0,
        EstadoContrato: estadoContrato,
        FechaVencimiento: contrato ? contrato.fechaVencimiento || '' : '',
      };
    });
    return delay(data);
  },
};
