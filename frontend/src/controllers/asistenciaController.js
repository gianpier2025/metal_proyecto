import { renderAsistenciaView, renderListaAsistencia, renderTablaPagos, renderEditarHoraModal, renderTablaHistorial } from '../views/asistenciaView.js';
import { asistenciaService } from '../services/asistenciaService.js';
import { trabajadoresService } from '../services/trabajadoresService.js';
import { toast } from '../utils/Toast.js';
import { debounce, todayISO } from '../utils/helpers.js';
import * as bootstrap from 'bootstrap';

let activosList = [];
let trabajadoresVisibles = [];
let registrosMap = new Map();
let currentTab = 'registro';
let pagosData = null;
let selectedDate = todayISO();

// Estado del historial
let histFiltros = { desde: '', hasta: '', q: '' };

function resumirAsistencia(trabajadores, registros) {
  const activos = trabajadores.filter((worker) => worker.estado === 'Activo');
  const activosIds = new Set(activos.map((worker) => worker.id));
  const presentes = registros.filter((record) => activosIds.has(record.trabajadorId));
  const puntuales = presentes.filter((record) => record.horaEntrada && record.horaEntrada <= '07:15').length;
  return {
    totalActivos: activos.length,
    presentes: presentes.length,
    conSalida: presentes.filter((record) => record.horaSalida).length,
    puntual: presentes.length ? Math.round((puntuales / presentes.length) * 100) : 0,
    faltantes: Math.max(0, activos.length - presentes.length),
  };
}

export async function asistenciaController(container) {
  currentTab = 'registro';
  pagosData = null;
  selectedDate = todayISO();
  histFiltros = { desde: '', hasta: '', q: '' };
  const [registrosHoy, trabajadores] = await Promise.all([
    asistenciaService.getToday(selectedDate),
    trabajadoresService.getAll(),
  ]);
  registrosMap = new Map(registrosHoy.map((r) => [r.trabajadorId, r]));

  activosList = trabajadores.filter((t) => t.estado === 'Activo');
  trabajadoresVisibles = trabajadores.filter((t) => t.estado !== 'Inactivo');

  renderAsistenciaView(container, resumirAsistencia(trabajadores, registrosHoy), registrosHoy, selectedDate);
  renderListaAsistencia('listaAsistencia', trabajadoresVisibles, registrosMap);
  bindAttendanceActions();
  bindDatePicker();

  bindTabs();
  bindSearch();
  bindExportPagos();
  bindHistorialControls();
}

function bindDatePicker() {
  const dateInput = document.getElementById('attendanceDate');
  if (!dateInput) return;
  dateInput.addEventListener('change', async (event) => {
    const value = event.target.value;
    if (!value) return;
    selectedDate = value;
    try {
      await refreshRegistros();
    } catch (error) {
      toast(error.message || 'No se pudo cargar la asistencia de esa fecha', 'danger');
    }
  });
}

function bindTabs() {
  document.querySelectorAll('.db-tab').forEach((tab) => {
    tab.addEventListener('click', async () => {
      const tabName = tab.dataset.tab;
      if (tabName === currentTab) return;
      currentTab = tabName;

      document.querySelectorAll('.db-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tabName));
      document.querySelectorAll('.db-tab-content').forEach((c) => c.classList.remove('active'));

      const tabElId = tabName === 'registro' ? 'tabRegistro' : tabName === 'historial' ? 'tabHistorial' : 'tabPagos';
      document.getElementById(tabElId).classList.add('active');

      if (tabName === 'pagos' && !pagosData) {
        await loadPagos();
      }
      if (tabName === 'historial') {
        await loadHistorial();
      }
    });
  });
}

async function loadPagos() {
  const tbody = document.getElementById('tbodyPagos');
  const tfoot = document.getElementById('tfootPagos');
  const emptyEl = document.getElementById('pagosEmpty');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3"><span class="spinner-border spinner-border-sm text-primary"></span> Calculando...</td></tr>';
  try {
    pagosData = await asistenciaService.getPagosEstimados();
    renderTablaPagos(tbody, tfoot, emptyEl, pagosData);
  } catch (error) {
    pagosData = null;
    tbody.innerHTML = '';
    emptyEl.classList.remove('d-none');
    toast(error.message || 'No se pudieron cargar los pagos', 'danger');
  }
}

function bindSearch() {
  const searchInput = document.getElementById('searchAsistencia');
  if (!searchInput) return;
  const handleSearch = debounce((e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = trabajadoresVisibles.filter((t) =>
      `${t.nombres} ${t.apellidos}`.toLowerCase().includes(q) || t.dni.includes(q)
    );
    renderListaAsistencia('listaAsistencia', filtered, registrosMap);
    bindAttendanceActions();
  }, 250);
  searchInput.addEventListener('input', handleSearch);
}

function bindExportPagos() {
  const btn = document.getElementById('btnExportPagos');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Generando...';
    try {
      const data = await asistenciaService.exportPagos();
      downloadCSV(data, 'pagos_estimados_db.csv');
      toast('Reporte de pagos exportado', 'success');
    } catch (err) {
      toast('Error al exportar pagos', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-download me-1"></i> Exportar Pagos';
    }
  });
}

function bindAttendanceActions() {
  document.querySelectorAll('.btnEntrada').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const trabajador = activosList.find((item) => item.id === id);
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      try {
        await asistenciaService.marcar(id, 'entrada', selectedDate);
        toast(`Entrada registrada: ${trabajador?.nombres || ''} ${trabajador?.apellidos || ''}`.trim(), 'success');
        await refreshRegistros();
      } catch (error) {
        toast(error.message || 'No se pudo registrar la entrada', 'danger');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    });
  });

  document.querySelectorAll('.btnSalida').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const trabajador = activosList.find((item) => item.id === id);
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      try {
        await asistenciaService.marcar(id, 'salida', selectedDate);
        toast(`Salida registrada: ${trabajador?.nombres || ''} ${trabajador?.apellidos || ''}`.trim(), 'primary');
        await refreshRegistros();
      } catch (error) {
        toast(error.message || 'No se pudo registrar la salida', 'danger');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    });
  });

  document.querySelectorAll('.btnDeshacer').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const registroId = btn.dataset.id;
      const campo = btn.dataset.campo;
      try {
        await asistenciaService.deshacerRegistro(registroId, campo);
        const campoLabel = campo === 'horaEntrada' ? 'Entrada' : 'Salida';
        toast(`${campoLabel} deshecha`, 'warning');
        await refreshRegistros();
      } catch (error) {
        toast(error.message || 'No se pudo deshacer el registro', 'danger');
      }
    });
  });

  document.querySelectorAll('.btnEditarHora').forEach((btn) => {
    btn.addEventListener('click', () => {
      const registroId = btn.dataset.id;
      const campo = btn.dataset.campo;
      const hora = btn.dataset.hora;
      openEditarHoraModal(registroId, campo, hora);
    });
  });
}

let editarModalInstance = null;

function openEditarHoraModal(registroId, campo, horaActual) {
  if (editarModalInstance) {
    editarModalInstance.hide();
    const existing = document.getElementById('editarHoraModal');
    if (existing) existing.remove();
  }

  const registro = [...registrosMap.values()].find((item) => item.id === registroId);
  const trabajador = registro?.trabajador;
  const nombreTrabajador = trabajador ? `${trabajador.nombres} ${trabajador.apellidos}` : 'Trabajador';

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderEditarHoraModal(registroId, campo, horaActual, nombreTrabajador);
  document.body.appendChild(wrapper.firstElementChild);

  const modalEl = document.getElementById('editarHoraModal');
  editarModalInstance = new bootstrap.Modal(modalEl);
  editarModalInstance.show();

  modalEl.addEventListener('hidden.bs.modal', () => {
    modalEl.remove();
    editarModalInstance = null;
  });

  document.getElementById('btnConfirmarEdicion').addEventListener('click', async () => {
    const saveButton = document.getElementById('btnConfirmarEdicion');
    const nuevaHora = document.getElementById('nuevaHora').value;
    const errorEl = document.getElementById('nuevaHoraError');
    if (!nuevaHora) {
      errorEl.textContent = 'Ingrese una hora valida';
      document.getElementById('nuevaHora').classList.add('is-invalid');
      return;
    }
    saveButton.disabled = true;
    try {
      await asistenciaService.corregirRegistro(registroId, campo, nuevaHora);
      const campoLabel = campo === 'horaEntrada' ? 'Entrada' : 'Salida';
      toast(`${campoLabel} corregida`, 'success');
      editarModalInstance.hide();
      await refreshRegistros();
    } catch (error) {
      toast(error.message || 'No se pudo corregir la hora', 'danger');
      saveButton.disabled = false;
    }
  });
}

async function refreshRegistros() {
  const registrosHoy = await asistenciaService.getToday(selectedDate);
  const resumen = resumirAsistencia(activosList, registrosHoy);
  registrosMap = new Map(registrosHoy.map((r) => [r.trabajadorId, r]));
  const searchInput = document.getElementById('searchAsistencia');
  const q = (searchInput?.value || '').toLowerCase().trim();
  const filtered = trabajadoresVisibles.filter((t) =>
    `${t.nombres} ${t.apellidos}`.toLowerCase().includes(q) || t.dni.includes(q)
  );
  renderListaAsistencia('listaAsistencia', filtered, registrosMap);
  bindAttendanceActions();

  const elActivos = document.getElementById('statActivos');
  const elPresentes = document.getElementById('statPresentes');
  const elFaltantes = document.getElementById('statFaltantes');
  const elPuntualidad = document.getElementById('statPuntualidad');
  if (elActivos) elActivos.textContent = resumen.totalActivos;
  if (elPresentes) elPresentes.textContent = resumen.presentes;
  if (elFaltantes) elFaltantes.textContent = resumen.faltantes;
  if (elPuntualidad) elPuntualidad.textContent = resumen.puntual + '%';

  if (currentTab === 'pagos') {
    pagosData = null;
    await loadPagos();
  }
}

// ── Historial de Asistencia ────────────────────────────────────────────────

async function loadHistorial() {
  const tbody = document.getElementById('tbodyHistorial');
  if (!tbody) return;
  // Spinner mientras carga
  tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3"><span class="spinner-border spinner-border-sm text-primary"></span> Cargando...</td></tr>';
  try {
    const registros = await asistenciaService.getHistorial(histFiltros);
    renderTablaHistorial(registros);
  } catch (error) {
    tbody.innerHTML = '';
    document.getElementById('historialEmpty')?.classList.remove('d-none');
    toast(error.message || 'No se pudo cargar el historial', 'danger');
  }
}

function bindHistorialControls() {
  // Búsqueda de trabajador (debounced)
  const searchInput = document.getElementById('histSearchTrabajador');
  if (searchInput) {
    const handleSearch = debounce(async (e) => {
      histFiltros.q = e.target.value;
      if (currentTab === 'historial') await loadHistorial();
    }, 280);
    searchInput.addEventListener('input', handleSearch);
  }

  // Fecha Desde
  const fechaDesde = document.getElementById('histFechaDesde');
  if (fechaDesde) {
    fechaDesde.addEventListener('change', async (e) => {
      histFiltros.desde = e.target.value;
      if (currentTab === 'historial') await loadHistorial();
    });
  }

  // Fecha Hasta
  const fechaHasta = document.getElementById('histFechaHasta');
  if (fechaHasta) {
    fechaHasta.addEventListener('change', async (e) => {
      histFiltros.hasta = e.target.value;
      if (currentTab === 'historial') await loadHistorial();
    });
  }

  // Limpiar filtros
  const btnLimpiar = document.getElementById('btnLimpiarHistorial');
  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', async () => {
      histFiltros = { desde: '', hasta: '', q: '' };
      if (searchInput) searchInput.value = '';
      if (fechaDesde) fechaDesde.value = '';
      if (fechaHasta) fechaHasta.value = '';
      if (currentTab === 'historial') await loadHistorial();
    });
  }

  // Exportar CSV del historial
  const btnExport = document.getElementById('btnExportHistorial');
  if (btnExport) {
    btnExport.addEventListener('click', async () => {
      btnExport.disabled = true;
      btnExport.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Generando...';
      try {
        const data = await asistenciaService.exportHistorial(histFiltros);
        downloadCSV(data, 'historial_asistencia.csv');
        toast('Historial exportado', 'success');
      } catch {
        toast('Error al exportar historial', 'danger');
      } finally {
        btnExport.disabled = false;
        btnExport.innerHTML = '<i class="bi bi-download me-1"></i>Exportar CSV';
      }
    });
  }
}

function downloadCSV(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((h) => `"${row[h] ?? ''}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
