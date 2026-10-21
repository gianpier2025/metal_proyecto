import { renderAsistenciaView, renderListaAsistencia, renderTablaPagos, renderEditarHoraModal } from '../views/asistenciaView.js';
import { asistenciaService } from '../services/asistenciaService.js';
import { store } from '../utils/Store.js';
import { toast } from '../utils/Toast.js';
import { debounce, todayISO } from '../utils/helpers.js';
import * as bootstrap from 'bootstrap';

let activosList = [];
let registrosMap = new Map();
let currentTab = 'registro';
let pagosData = null;
let selectedDate = todayISO();

export async function asistenciaController(container) {
  selectedDate = todayISO();
  const resumen = await asistenciaService.getResumenHoy(selectedDate);
  const registrosHoy = await asistenciaService.getToday(selectedDate);
  registrosMap = new Map(registrosHoy.map((r) => [r.trabajadorId, r]));

  const { trabajadores } = store.get();
  activosList = trabajadores.filter((t) => t.estado === 'Activo');

  renderAsistenciaView(container, resumen, registrosHoy, selectedDate);
  renderListaAsistencia('listaAsistencia', activosList, registrosMap);
  bindAttendanceActions();
  bindDatePicker();

  bindTabs();
  bindSearch();
  bindExportPagos();
}

function bindDatePicker() {
  const dateInput = document.getElementById('attendanceDate');
  if (!dateInput) return;
  dateInput.addEventListener('change', async (event) => {
    const value = event.target.value;
    if (!value) return;
    selectedDate = value;
    await refreshRegistros();
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
      document.getElementById(tabName === 'registro' ? 'tabRegistro' : 'tabPagos').classList.add('active');

      if (tabName === 'pagos' && !pagosData) {
        await loadPagos();
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
  pagosData = await asistenciaService.getPagosEstimados();
  renderTablaPagos(tbody, tfoot, emptyEl, pagosData);
}

function bindSearch() {
  const searchInput = document.getElementById('searchAsistencia');
  if (!searchInput) return;
  const handleSearch = debounce((e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = activosList.filter((t) =>
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
      const id = parseInt(btn.dataset.id, 10);
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      await asistenciaService.marcar(id, 'entrada', selectedDate);
      const t = store.getTrabajadorById(id);
      toast(`Entrada registrada: ${t.nombres} ${t.apellidos}`, 'success');
      await refreshRegistros();
    });
  });

  document.querySelectorAll('.btnSalida').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id, 10);
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      await asistenciaService.marcar(id, 'salida', selectedDate);
      const t = store.getTrabajadorById(id);
      toast(`Salida registrada: ${t.nombres} ${t.apellidos}`, 'primary');
      await refreshRegistros();
    });
  });

  document.querySelectorAll('.btnDeshacer').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const registroId = parseInt(btn.dataset.id, 10);
      const campo = btn.dataset.campo;
      await asistenciaService.deshacerRegistro(registroId, campo);
      const campoLabel = campo === 'horaEntrada' ? 'Entrada' : 'Salida';
      toast(`${campoLabel} deshecha`, 'warning');
      await refreshRegistros();
    });
  });

  document.querySelectorAll('.btnEditarHora').forEach((btn) => {
    btn.addEventListener('click', () => {
      const registroId = parseInt(btn.dataset.id, 10);
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

  const registro = store.get().asistencia.find((a) => a.id === registroId);
  const trabajador = store.getTrabajadorById(registro?.trabajadorId);
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
    const nuevaHora = document.getElementById('nuevaHora').value;
    const errorEl = document.getElementById('nuevaHoraError');
    if (!nuevaHora) {
      errorEl.textContent = 'Ingrese una hora valida';
      document.getElementById('nuevaHora').classList.add('is-invalid');
      return;
    }
    await asistenciaService.corregirRegistro(registroId, campo, nuevaHora);
    const campoLabel = campo === 'horaEntrada' ? 'Entrada' : 'Salida';
    toast(`${campoLabel} corregida`, 'success');
    editarModalInstance.hide();
    await refreshRegistros();
  });
}

async function refreshRegistros() {
  const registrosHoy = await asistenciaService.getToday(selectedDate);
  registrosMap = new Map(registrosHoy.map((r) => [r.trabajadorId, r]));
  const searchInput = document.getElementById('searchAsistencia');
  const q = (searchInput?.value || '').toLowerCase().trim();
  const filtered = activosList.filter((t) =>
    `${t.nombres} ${t.apellidos}`.toLowerCase().includes(q) || t.dni.includes(q)
  );
  renderListaAsistencia('listaAsistencia', filtered, registrosMap);
  bindAttendanceActions();

  const resumen = await asistenciaService.getResumenHoy(selectedDate);
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
