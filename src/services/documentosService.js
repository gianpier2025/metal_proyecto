import { store } from '../utils/Store.js';
import { calcularEstadoDocumento, calcularDiasRestantes, todayISO } from '../utils/helpers.js';
import { ESTADOS_CONTRATO } from '../config.js';

function delay(data, ms = 250) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

function calcularEstadoContrato(contrato) {
  if (!contrato.nombreArchivo && !contrato.fechaVencimiento) return 'SIN_PDF';
  if (!contrato.nombreArchivo) return 'SIN_PDF';
  return calcularEstadoDocumento(contrato.fechaVencimiento);
}

export const documentosService = {
  async getAll() {
    const { documentos, trabajadores } = store.get();
    const enriched = documentos.map((d) => {
      const t = trabajadores.find((tr) => tr.id === d.trabajadorId);
      const estadoKey = calcularEstadoContrato(d);
      const estado = ESTADOS_CONTRATO[estadoKey];
      return {
        ...d,
        trabajador: t,
        estadoKey,
        estadoLabel: estado.label,
        estadoVariant: estado.variant,
        estadoIcon: estado.icon,
      };
    });
    return delay(enriched);
  },

  async getByTrabajador(trabajadorId) {
    const all = await this.getAll();
    return all.filter((d) => d.trabajadorId === trabajadorId);
  },

  async getAlerts() {
    const all = await this.getAll();
    return all.filter(
      (d) => d.estadoKey === 'VENCIDO' || d.estadoKey === 'POR_VENCER'
    );
  },

  async uploadPdf(contratoId, file, fechas) {
    const tamanoKB = Math.round(file.size / 1024);
    const fileInfo = {
      name: file.name,
      fechaSubida: todayISO(),
      tamanoKB,
    };
    store.uploadContrato(contratoId, fileInfo);
    if (fechas && fechas.fechaInicio) {
      store.actualizarFechasContrato(contratoId, fechas.fechaInicio, fechas.fechaVencimiento || null);
    }
    return delay({ success: true, ...fileInfo });
  },

  async actualizarFechas(contratoId, fechaInicio, fechaVencimiento) {
    store.actualizarFechasContrato(contratoId, fechaInicio, fechaVencimiento);
    return delay({ success: true });
  },

  async removePdf(contratoId) {
    store.removeContratoPdf(contratoId);
    return delay({ success: true });
  },
};
