import { renderDocumentosView, renderDocumentosTable, renderUploadModal } from '../views/documentosView.js';
import { documentosService } from '../services/documentosService.js';
import { store } from '../utils/Store.js';
import { toast } from '../utils/Toast.js';
import { debounce } from '../utils/helpers.js';
import * as bootstrap from 'bootstrap';

let allDocs = [];
let selectedFile = null;
let modalInstance = null;

export async function documentosController(container) {
  renderDocumentosView(container);

  const tbody = document.getElementById('tbodyDocumentos');
  const emptyEl = document.getElementById('docsEmpty');
  const searchInput = document.getElementById('searchDoc');
  const filtroEstado = document.getElementById('filtroEstado');

  allDocs = await documentosService.getAll();
  applyFilters();

  const handleSearch = debounce(applyFilters, 250);
  searchInput.addEventListener('input', handleSearch);
  filtroEstado.addEventListener('change', applyFilters);

  function applyFilters() {
    const q = searchInput.value.toLowerCase().trim();
    const estado = filtroEstado.value;

    let filtered = allDocs;
    if (q) {
      filtered = filtered.filter((d) => {
        const t = d.trabajador;
        return t && (t.nombres + ' ' + t.apellidos).toLowerCase().includes(q);
      });
    }
    if (estado) filtered = filtered.filter((d) => d.estadoKey === estado);

    renderDocumentosTable(tbody, emptyEl, filtered);
    updateCounts(filtered);
    bindRowActions();
  }

  function bindRowActions() {
    tbody.querySelectorAll('.btnSubirPdf').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const doc = allDocs.find((d) => d.id === id);
        if (doc) openUploadModal(doc);
      });
    });
    tbody.querySelectorAll('.btnEliminarPdf').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id, 10);
        const doc = allDocs.find((d) => d.id === id);
        if (doc) await confirmRemovePdf(doc);
      });
    });
  }
}

function updateCounts(docs) {
  const counts = { AL_DIA: 0, POR_VENCER: 0, VENCIDO: 0, SIN_PDF: 0 };
  docs.forEach((d) => { if (counts[d.estadoKey] != null) counts[d.estadoKey]++; });
  document.getElementById('cntAlDia').textContent = counts.AL_DIA;
  document.getElementById('cntPorVencer').textContent = counts.POR_VENCER;
  document.getElementById('cntVencido').textContent = counts.VENCIDO;
  document.getElementById('cntSinPdf').textContent = counts.SIN_PDF;
}

function openUploadModal(contrato) {
  if (modalInstance) {
    modalInstance.hide();
    const existing = document.getElementById('uploadPdfModal');
    if (existing) existing.remove();
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderUploadModal(contrato);
  document.body.appendChild(wrapper.firstElementChild);

  const modalEl = document.getElementById('uploadPdfModal');
  modalInstance = new bootstrap.Modal(modalEl);
  modalInstance.show();

  modalEl.addEventListener('hidden.bs.modal', () => {
    modalEl.remove();
    modalInstance = null;
    selectedFile = null;
  });

  setupDropZone();
  setupConfirmButton(contrato);

  const quitarBtn = document.getElementById('btnQuitarActual');
  if (quitarBtn) {
    quitarBtn.addEventListener('click', async () => {
      await documentosService.removePdf(contrato.id);
      toast('PDF eliminado del contrato', 'warning');
      modalInstance.hide();
      await refreshDocs();
    });
  }
}

function setupDropZone() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('pdfFileInput');
  const filePreview = document.getElementById('filePreview');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const errorEl = document.getElementById('uploadError');
  const confirmBtn = document.getElementById('btnConfirmUpload');

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('d-none');
  }
  function clearError() {
    errorEl.classList.add('d-none');
  }

  function handleFile(file) {
    clearError();
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showError('Solo se permiten archivos PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showError('El archivo excede el maximo de 10 MB');
      return;
    }
    selectedFile = file;
    fileName.textContent = file.name;
    const kb = Math.round(file.size / 1024);
    fileSize.textContent = kb < 1024 ? kb + ' KB' : (kb / 1024).toFixed(1) + ' MB';
    filePreview.classList.remove('d-none');
    dropZone.classList.add('d-none');
    confirmBtn.disabled = false;
  }

  function resetFile() {
    selectedFile = null;
    fileInput.value = '';
    filePreview.classList.add('d-none');
    dropZone.classList.remove('d-none');
    confirmBtn.disabled = true;
    clearError();
  }

  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('db-dropzone-active');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('db-dropzone-active');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('db-dropzone-active');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });

  document.getElementById('btnClearFile').addEventListener('click', resetFile);
}

function setupConfirmButton(contrato) {
  const confirmBtn = document.getElementById('btnConfirmUpload');
  confirmBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Subiendo...';

    const fechaInicio = document.getElementById('fechaInicioContrato')?.value || null;
    const fechaVencimiento = document.getElementById('fechaVencimientoContrato')?.value || null;
    const fechas = fechaInicio ? { fechaInicio, fechaVencimiento } : null;

    try {
      await documentosService.uploadPdf(contrato.id, selectedFile, fechas);
      toast('PDF del contrato subido correctamente', 'success');
      modalInstance.hide();
      await refreshDocs();
    } catch (err) {
      toast('Error al subir el PDF', 'danger');
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Subir PDF';
    }
  });
}

async function confirmRemovePdf(contrato) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="modal fade" tabindex="-1" id="confirmRemovePdfModal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-exclamation-triangle text-danger me-2"></i>Eliminar PDF</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p>Seguro que desea eliminar el PDF del contrato de <strong>${contrato.trabajador ? contrato.trabajador.nombres + ' ' + contrato.trabajador.apellidos : 'este trabajador'}</strong>?</p>
            <p style="font-size: 0.8rem; color: var(--db-gray)">El registro del contrato se mantiene, solo se quitara el archivo PDF.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-db-outline" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn-db-primary" id="btnConfirmRemovePdf" style="background: var(--db-danger)"><i class="bi bi-trash me-1"></i> Eliminar PDF</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper.firstElementChild);
  const modalEl = document.getElementById('confirmRemovePdfModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
  modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());

  document.getElementById('btnConfirmRemovePdf').addEventListener('click', async () => {
    await documentosService.removePdf(contrato.id);
    toast('PDF eliminado del contrato', 'warning');
    modal.hide();
    await refreshDocs();
  });
}

async function refreshDocs() {
  const tbody = document.getElementById('tbodyDocumentos');
  const emptyEl = document.getElementById('docsEmpty');
  const searchInput = document.getElementById('searchDoc');
  const filtroEstado = document.getElementById('filtroEstado');
  if (!tbody) return;

  allDocs = await documentosService.getAll();

  const q = (searchInput?.value || '').toLowerCase().trim();
  const estado = filtroEstado?.value || '';
  let filtered = allDocs;
  if (q) filtered = filtered.filter((d) => d.trabajador && (d.trabajador.nombres + ' ' + d.trabajador.apellidos).toLowerCase().includes(q));
  if (estado) filtered = filtered.filter((d) => d.estadoKey === estado);

  renderDocumentosTable(tbody, emptyEl, filtered);
  updateCounts(filtered);
  tbody.querySelectorAll('.btnSubirPdf').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      const doc = allDocs.find((d) => d.id === id);
      if (doc) openUploadModal(doc);
    });
  });
  tbody.querySelectorAll('.btnEliminarPdf').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id, 10);
      const doc = allDocs.find((d) => d.id === id);
      if (doc) await confirmRemovePdf(doc);
    });
  });
}
