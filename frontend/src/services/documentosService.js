import { apiRequest } from './apiClient.js';

function withDisplayFields(contract) {
  const tamanoBytes = Number(contract.tamanoBytes || 0);
  return {
    ...contract,
    tamanoKB: tamanoBytes ? Math.round(tamanoBytes / 1024) : null,
  };
}

export const documentosService = {
  async getAll() {
    const contracts = await apiRequest('/contratos');
    return contracts.map(withDisplayFields);
  },

  async getByTrabajador(trabajadorId) {
    const all = await this.getAll();
    return all.filter((contract) => contract.trabajadorId === trabajadorId);
  },

  async getAlerts() {
    const contracts = await apiRequest('/contratos/alertas');
    return contracts.map(withDisplayFields);
  },

  async create(data, file = null) {
    const contract = await apiRequest('/contratos', {
      method: 'POST',
      body: {
        trabajadorId: data.trabajadorId,
        modalidad: data.modalidad,
        fechaInicio: data.fechaInicio,
        fechaVencimiento: data.fechaVencimiento || null,
      },
    });

    if (!file) return withDisplayFields(contract);

    try {
      return await this.uploadPdf(contract.id, file);
    } catch (error) {
      error.contractCreated = true;
      throw error;
    }
  },

  async uploadPdf(contractId, file, fechas = null) {
    const name = encodeURIComponent(file.name || 'contrato.pdf');
    await apiRequest(`/contratos/${encodeURIComponent(contractId)}/archivo?nombre=${name}`, {
      method: 'POST',
      body: file,
      rawBody: true,
      headers: { 'Content-Type': 'application/pdf' },
    });

    if (fechas?.fechaInicio) {
      await this.actualizarFechas(contractId, fechas.fechaInicio, fechas.fechaVencimiento || null);
    }

    return (await this.getAll()).find((contract) => contract.id === contractId);
  },

  async getPdf(contractId) {
    return apiRequest(`/contratos/${encodeURIComponent(contractId)}/archivo`, {
      responseType: 'blob',
    });
  },

  async actualizarFechas(contractId, fechaInicio, fechaVencimiento) {
    return apiRequest(`/contratos/${encodeURIComponent(contractId)}/fechas`, {
      method: 'PATCH',
      body: { fechaInicio, fechaVencimiento: fechaVencimiento || null },
    });
  },

  async removePdf(contractId) {
    return apiRequest(`/contratos/${encodeURIComponent(contractId)}/archivo`, {
      method: 'DELETE',
    });
  },
};
