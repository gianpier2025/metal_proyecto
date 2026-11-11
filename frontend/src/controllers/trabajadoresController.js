import {
  renderTrabajadoresView,
  renderTrabajadoresTable,
  renderTrabajadorModal,
  renderExpedienteModal,
} from '../views/trabajadoresView.js';
import { trabajadoresService } from '../services/trabajadoresService.js';
import { store } from '../utils/Store.js';
import { toast } from '../utils/Toast.js';
import { debounce, todayISO, escapeHTML, calcularHorasTrabajador } from '../utils/helpers.js';
import * as bootstrap from 'bootstrap';
import { canManage } from '../utils/accessControl.js';

let currentTrabajadores = [];
let modalInstance = null;
let expedienteModalInstance = null;

export async function trabajadoresController(container) {
  const puedeGestionar = canManage(store.get().currentUser?.role, 'trabajadores');
  currentTrabajadores = await trabajadoresService.search('');
  renderTrabajadoresView(container, puedeGestionar);

  const tbody = document.getElementById('tbodyTrabajadores');
  const emptyEl = document.getElementById('trabajadoresEmpty');
  const searchInput = document.getElementById('searchTrabajador');

  async function loadTrabajadores(query = '') {
    currentTrabajadores = await trabajadoresService.search(query);
    renderTrabajadoresTable(tbody, emptyEl, currentTrabajadores, puedeGestionar);
    bindRowActions();
  }

  renderTrabajadoresTable(tbody, emptyEl, currentTrabajadores, puedeGestionar);
  bindRowActions();

  const handleSearch = debounce(async (e) => {
    await loadTrabajadores(e.target.value);
  }, 250);
  searchInput.addEventListener('input', handleSearch);

  document.getElementById('btnNuevoTrabajador')?.addEventListener('click', () => openModal(false));

  function bindRowActions() {
    tbody.querySelectorAll('.btnExpediente').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = currentTrabajadores.find((worker) => worker.id === btn.dataset.id);
        if (t) openExpedienteModal(t);
      });
    });
    tbody.querySelectorAll('.btnEditar').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = currentTrabajadores.find((worker) => worker.id === btn.dataset.id);
        if (t) openModal(true, t);
      });
    });
    tbody.querySelectorAll('.btnEliminar').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = currentTrabajadores.find((worker) => worker.id === btn.dataset.id);
        if (t) confirmDelete(t);
      });
    });
  }
}

function openModal(isEdit, trabajador = null) {
  if (modalInstance) {
    modalInstance.hide();
    const existing = document.getElementById('trabajadorModal');
    if (existing) existing.remove();
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderTrabajadorModal(isEdit, trabajador);
  document.body.appendChild(wrapper.firstElementChild);

  const modalEl = document.getElementById('trabajadorModal');
  modalInstance = new bootstrap.Modal(modalEl);
  modalInstance.show();

  modalEl.addEventListener('hidden.bs.modal', () => {
    modalEl.remove();
    modalInstance = null;
  });

  const saveBtn = document.getElementById('btnGuardarTrabajador');
  saveBtn.addEventListener('click', () => handleSave(isEdit));
}

function handleSave(isEdit) {
  const form = document.getElementById('trabajadorForm');
  const fields = {
    nombres: document.getElementById('trNombres'),
    apellidos: document.getElementById('trApellidos'),
    dni: document.getElementById('trDni'),
    cargo: document.getElementById('trCargo'),
    estado: document.getElementById('trEstado'),
    telefono: document.getElementById('trTelefono'),
    email: document.getElementById('trEmail'),
    fechaIngreso: document.getElementById('trFechaIngreso'),
    salarioBase: document.getElementById('trSalario'),
    tarifaPorHora: document.getElementById('trTarifa'),
    direccion: document.getElementById('trDireccion'),
  };

  let valid = true;
  Object.values(fields).forEach((f) => f.classList.remove('is-invalid'));

  if (!fields.nombres.value.trim()) { fields.nombres.classList.add('is-invalid'); valid = false; }
  if (!fields.apellidos.value.trim()) { fields.apellidos.classList.add('is-invalid'); valid = false; }
  if (!fields.dni.value.trim() || !/^\d{8}$/.test(fields.dni.value.trim())) { fields.dni.classList.add('is-invalid'); valid = false; }
  if (!fields.cargo.value) { fields.cargo.classList.add('is-invalid'); valid = false; }
  if (fields.tarifaPorHora.value === '' || Number(fields.tarifaPorHora.value) < 0) {
    fields.tarifaPorHora.classList.add('is-invalid'); valid = false;
  }
  if (fields.email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.value.trim())) {
    fields.email.classList.add('is-invalid'); valid = false;
  }

  if (!valid) {
    toast('Complete los campos resaltados', 'danger');
    return;
  }

  const data = {
    nombres: fields.nombres.value.trim(),
    apellidos: fields.apellidos.value.trim(),
    dni: fields.dni.value.trim(),
    cargo: fields.cargo.value,
    estado: fields.estado.value,
    telefono: fields.telefono.value.trim(),
    email: fields.email.value.trim(),
    fechaIngreso: fields.fechaIngreso.value || todayISO(),
    salarioBase: parseInt(fields.salarioBase.value, 10) || 0,
    tarifaPorHora: parseFloat(fields.tarifaPorHora.value) || 0,
    direccion: fields.direccion.value.trim(),
  };

  const saveBtn = document.getElementById('btnGuardarTrabajador');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Guardando...';

  const id = document.getElementById('trabajadorId').value;
  const op = isEdit
    ? trabajadoresService.update(id, data)
    : trabajadoresService.create(data);

  op.then(() => {
    toast(isEdit ? 'Trabajador actualizado' : 'Trabajador registrado', 'success');
    modalInstance.hide();
    refreshTable();
  }).catch((error) => {
    toast(error.message || 'Error al guardar el trabajador', 'danger');
    saveBtn.disabled = false;
    saveBtn.innerHTML = `<i class="bi bi-check-lg me-1"></i> ${isEdit ? 'Actualizar' : 'Registrar'}`;
  });
}

function confirmDelete(trabajador) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="modal fade" tabindex="-1" id="confirmDeleteModal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-exclamation-triangle text-danger me-2"></i>Confirmar Eliminación</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p>¿Seguro que desea eliminar a <strong>${escapeHTML(trabajador.nombres)} ${escapeHTML(trabajador.apellidos)}</strong>?</p>
            <p style="font-size: 0.8rem; color: var(--db-gray)">Esta acción también eliminará sus documentos y registros de asistencia.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-db-outline" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn-db-primary" id="btnConfirmDelete" style="background: var(--db-danger)"><i class="bi bi-trash me-1"></i> Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper.firstElementChild);
  const modalEl = document.getElementById('confirmDeleteModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());

  document.getElementById('btnConfirmDelete').addEventListener('click', async () => {
    await trabajadoresService.remove(trabajador.id);
    toast('Trabajador eliminado', 'warning');
    modal.hide();
    refreshTable();
  });
}

async function refreshTable() {
  const tbody = document.getElementById('tbodyTrabajadores');
  const emptyEl = document.getElementById('trabajadoresEmpty');
  const searchInput = document.getElementById('searchTrabajador');
  if (!tbody) return;
  currentTrabajadores = await trabajadoresService.search(searchInput?.value || '');
  renderTrabajadoresTable(tbody, emptyEl, currentTrabajadores, canManage(store.get().currentUser?.role, 'trabajadores'));
  tbody.querySelectorAll('.btnExpediente').forEach((btn) => {
    btn.addEventListener('click', () => {
      const t = currentTrabajadores.find((worker) => worker.id === btn.dataset.id);
      if (t) openExpedienteModal(t);
    });
  });
  tbody.querySelectorAll('.btnEditar').forEach((btn) => {
    btn.addEventListener('click', () => {
      const t = currentTrabajadores.find((worker) => worker.id === btn.dataset.id);
      if (t) openModal(true, t);
    });
  });
  tbody.querySelectorAll('.btnEliminar').forEach((btn) => {
    btn.addEventListener('click', () => {
      const t = currentTrabajadores.find((worker) => worker.id === btn.dataset.id);
      if (t) confirmDelete(t);
    });
  });
}

function openExpedienteModal(trabajador) {
  if (expedienteModalInstance) {
    expedienteModalInstance.hide();
    const existing = document.getElementById('expedienteModal');
    if (existing) existing.remove();
  }

  const { documentos, asistencia } = store.get();
  const contrato = documentos.find((d) => d.trabajadorId === trabajador.id) || null;
  const asistencias = asistencia
    .filter((a) => a.trabajadorId === trabajador.id)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  const diasRegistrados = asistencias.length;
  const totalHoras = calcularHorasTrabajador(asistencia, trabajador.id);
  const puntuales = asistencias.filter((a) => a.horaEntrada && a.horaEntrada <= '07:15').length;
  const puntualidad = diasRegistrados > 0 ? Math.round((puntuales / diasRegistrados) * 100) : 0;
  const tardanzas = asistencias.filter((a) => a.horaEntrada && a.horaEntrada > '07:15').length;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderExpedienteModal(trabajador, contrato, asistencias, {
    totalHoras,
    diasRegistrados,
    puntualidad,
    tardanzas,
  }, canManage(store.get().currentUser?.role, 'trabajadores'));
  document.body.appendChild(wrapper.firstElementChild);

  const modalEl = document.getElementById('expedienteModal');
  expedienteModalInstance = new bootstrap.Modal(modalEl);
  expedienteModalInstance.show();

  modalEl.addEventListener('hidden.bs.modal', () => {
    modalEl.remove();
    expedienteModalInstance = null;
  });

  const btnPrint = document.getElementById('btnImprimirExpediente');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  const btnDescargar = document.getElementById('btnDescargarPdfExpediente');
  if (btnDescargar) {
    btnDescargar.addEventListener('click', () => {
      const nombre = btnDescargar.dataset.nombre || 'contrato.pdf';
      toast(`Descargando documento: ${nombre}`, 'primary');
    });
  }

  const btnEditFromExp = modalEl.querySelector('.btnEditarDesdeExpediente');
  if (btnEditFromExp) {
    btnEditFromExp.addEventListener('click', () => {
      expedienteModalInstance.hide();
      openModal(true, trabajador);
    });
  }
}
