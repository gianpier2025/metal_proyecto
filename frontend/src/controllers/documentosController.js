import {
  renderDocumentosView,
  renderDocumentosTable,
  renderUploadModal,
  renderNuevoContratoModal,
  renderPdfViewerModal,
} from '../views/documentosView.js';
import { documentosService } from '../services/documentosService.js';
import { trabajadoresService } from '../services/trabajadoresService.js';
import { toast } from '../utils/Toast.js';
import { debounce } from '../utils/helpers.js';
import * as bootstrap from 'bootstrap';

let allDocs = [];
let selectedFile = null;
let modalInstance = null;
let viewerModalInstance = null;
let nuevoContratoModalInstance = null;
let viewerFileUrl = null;

export async function documentosController(container) {
  try {
    allDocs = await documentosService.getAll();
  } catch (error) {
    toast(error.message || 'No se pudieron cargar los contratos', 'danger');
    allDocs = [];
  }
  renderDocumentosView(container);

  const tbody = document.getElementById('tbodyDocumentos');
  const emptyEl = document.getElementById('docsEmpty');
  const searchInput = document.getElementById('searchDoc');
  const filtroEstado = document.getElementById('filtroEstado');
  const btnNuevoContrato = document.getElementById('btnNuevoContrato');

  if (btnNuevoContrato) {
    btnNuevoContrato.addEventListener('click', () => {
      openNuevoContratoModal().catch((error) => toast(error.message || 'No se pudo abrir el registro de contrato', 'danger'));
    });
  }

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
    tbody.querySelectorAll('.btnVerPdf').forEach((btn) => {
      btn.addEventListener('click', () => {
        const doc = allDocs.find((d) => d.id === btn.dataset.id);
        if (doc) openPdfViewerModal(doc);
      });
    });
    tbody.querySelectorAll('.btnSubirPdf').forEach((btn) => {
      btn.addEventListener('click', () => {
        const doc = allDocs.find((d) => d.id === btn.dataset.id);
        if (doc) openUploadModal(doc);
      });
    });
    tbody.querySelectorAll('.btnEliminarPdf').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const doc = allDocs.find((d) => d.id === btn.dataset.id);
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

  setupDropZone(contrato);
  setupConfirmButton(contrato);

  const quitarBtn = document.getElementById('btnQuitarActual');
  if (quitarBtn) {
    quitarBtn.addEventListener('click', async () => {
      try {
        await documentosService.removePdf(contrato.id);
        toast('PDF eliminado del contrato', 'warning');
        modalInstance.hide();
        await refreshDocs();
      } catch (error) {
        toast(error.message || 'No se pudo eliminar el PDF', 'danger');
      }
    });
  }
}

function setupDropZone(contrato) {
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

  ['fechaInicioContrato', 'fechaVencimientoContrato'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => {
      const inicio = document.getElementById('fechaInicioContrato').value;
      const vencimiento = document.getElementById('fechaVencimientoContrato').value;
      const fechasChanged = inicio !== (contrato.fechaInicio || '') || vencimiento !== (contrato.fechaVencimiento || '');
      confirmBtn.disabled = !selectedFile && !fechasChanged;
      if (!selectedFile && fechasChanged) confirmBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Guardar fechas';
      else if (selectedFile) confirmBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Subir PDF';
      else confirmBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Subir PDF';
    });
  });
}

function setupConfirmButton(contrato) {
  const confirmBtn = document.getElementById('btnConfirmUpload');
  confirmBtn.addEventListener('click', async () => {
    const fechaInicio = document.getElementById('fechaInicioContrato')?.value || null;
    const fechaVencimiento = document.getElementById('fechaVencimientoContrato')?.value || null;
    const fechas = fechaInicio ? { fechaInicio, fechaVencimiento } : null;
    const fechasChanged = fechaInicio !== (contrato.fechaInicio || '') || fechaVencimiento !== (contrato.fechaVencimiento || '');
    if (!selectedFile && !fechasChanged) return;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = selectedFile
      ? '<span class="spinner-border spinner-border-sm me-1"></span> Subiendo...'
      : '<span class="spinner-border spinner-border-sm me-1"></span> Guardando...';

    try {
      if (selectedFile) {
        await documentosService.uploadPdf(contrato.id, selectedFile, fechas);
        toast('PDF del contrato subido correctamente', 'success');
      } else {
        await documentosService.actualizarFechas(contrato.id, fechaInicio, fechaVencimiento);
        toast('Fechas del contrato actualizadas', 'success');
      }
      modalInstance.hide();
      await refreshDocs();
    } catch (err) {
      toast(err.message || 'No se pudo guardar el contrato', 'danger');
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = selectedFile
        ? '<i class="bi bi-check-lg me-1"></i> Subir PDF'
        : '<i class="bi bi-check-lg me-1"></i> Guardar fechas';
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
    try {
      await documentosService.removePdf(contrato.id);
      toast('PDF eliminado del contrato', 'warning');
      modal.hide();
      await refreshDocs();
    } catch (error) {
      toast(error.message || 'No se pudo eliminar el PDF', 'danger');
    }
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

  tbody.querySelectorAll('.btnVerPdf').forEach((btn) => {
    btn.addEventListener('click', () => {
      const doc = allDocs.find((d) => d.id === btn.dataset.id);
      if (doc) openPdfViewerModal(doc);
    });
  });
  tbody.querySelectorAll('.btnSubirPdf').forEach((btn) => {
    btn.addEventListener('click', () => {
      const doc = allDocs.find((d) => d.id === btn.dataset.id);
      if (doc) openUploadModal(doc);
    });
  });
  tbody.querySelectorAll('.btnEliminarPdf').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const doc = allDocs.find((d) => d.id === btn.dataset.id);
      if (doc) await confirmRemovePdf(doc);
    });
  });
}

async function openNuevoContratoModal() {
  if (nuevoContratoModalInstance) {
    nuevoContratoModalInstance.hide();
    const existing = document.getElementById('nuevoContratoModal');
    if (existing) existing.remove();
  }

  const trabajadores = await trabajadoresService.getAll();
  const trabajadoresVigentes = trabajadores.filter((t) => t.estado !== 'Inactivo');

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderNuevoContratoModal(trabajadoresVigentes);
  document.body.appendChild(wrapper.firstElementChild);

  const modalEl = document.getElementById('nuevoContratoModal');
  nuevoContratoModalInstance = new bootstrap.Modal(modalEl);
  nuevoContratoModalInstance.show();

  let uploadedFile = null;

  modalEl.addEventListener('hidden.bs.modal', () => {
    modalEl.remove();
    nuevoContratoModalInstance = null;
    uploadedFile = null;
  });

  const dropZone = document.getElementById('ncDropZone');
  const fileInput = document.getElementById('ncPdfInput');
  const fileTitle = document.getElementById('ncFileTitle');
  const fileSubtitle = document.getElementById('ncFileSubtitle');

  function selectPdf(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast('Solo se permiten archivos PDF', 'danger');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('El PDF supera el máximo de 10 MB', 'danger');
      return;
    }
    uploadedFile = file;
    fileTitle.textContent = uploadedFile.name;
    fileSubtitle.textContent = `${Math.round(uploadedFile.size / 1024)} KB · Archivo seleccionado`;
    dropZone.style.borderColor = 'var(--db-success)';
    dropZone.style.background = 'rgba(26,135,84,0.06)';
  }

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) selectPdf(e.target.files[0]);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--db-primary)';
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--db-border)';
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) selectPdf(e.dataTransfer.files[0]);
  });

  const btnGuardar = document.getElementById('btnGuardarNuevoContrato');
  btnGuardar.addEventListener('click', async () => {
    const selTrabajador = document.getElementById('ncTrabajador');
    const inputInicio = document.getElementById('ncFechaInicio');
    const inputVenc = document.getElementById('ncFechaVencimiento');
    const tipo = document.getElementById('ncTipo').value;

    let valid = true;
    [selTrabajador, inputInicio, inputVenc].forEach((el) => el.classList.remove('is-invalid'));

    if (!selTrabajador.value) {
      selTrabajador.classList.add('is-invalid');
      valid = false;
    }
    if (!inputInicio.value) {
      inputInicio.classList.add('is-invalid');
      valid = false;
    }
    if (!inputVenc.value) {
      inputVenc.classList.add('is-invalid');
      valid = false;
    }
    if (inputInicio.value && inputVenc.value && inputVenc.value < inputInicio.value) {
      inputVenc.classList.add('is-invalid');
      toast('La fecha de vencimiento debe ser posterior al inicio', 'warning');
      valid = false;
    }

    if (!valid) return;

    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Registrando...';

    try {
      await documentosService.create({
        trabajadorId: selTrabajador.value,
        modalidad: tipo,
        fechaInicio: inputInicio.value,
        fechaVencimiento: inputVenc.value,
      }, uploadedFile);

      toast('Contrato registrado exitosamente', 'success');
      nuevoContratoModalInstance.hide();
      await refreshDocs();
    } catch (error) {
      if (error.contractCreated) {
        toast(`Contrato registrado, pero no se pudo subir el PDF: ${error.message}`, 'warning');
        nuevoContratoModalInstance.hide();
        await refreshDocs();
      } else {
        toast(error.message || 'No se pudo registrar el contrato', 'danger');
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = '<i class="bi bi-check-lg me-1"></i> Registrar Contrato';
      }
    }
  });
}

export async function openPdfViewerModal(contrato) {
  if (viewerFileUrl) {
    URL.revokeObjectURL(viewerFileUrl);
    viewerFileUrl = null;
  }
  if (viewerModalInstance) {
    viewerModalInstance.hide();
    const existing = document.getElementById('pdfViewerModal');
    if (existing) existing.remove();
  }

  try {
    const pdf = await documentosService.getPdf(contrato.id);
    viewerFileUrl = URL.createObjectURL(pdf);
  } catch (error) {
    toast(error.message || 'No se pudo abrir el PDF del contrato', 'danger');
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderPdfViewerModal({ ...contrato, fileUrl: viewerFileUrl });
  document.body.appendChild(wrapper.firstElementChild);

  const modalEl = document.getElementById('pdfViewerModal');
  viewerModalInstance = new bootstrap.Modal(modalEl);
  viewerModalInstance.show();

  modalEl.addEventListener('hidden.bs.modal', () => {
    modalEl.remove();
    viewerModalInstance = null;
    if (viewerFileUrl) {
      URL.revokeObjectURL(viewerFileUrl);
      viewerFileUrl = null;
    }
  });

  const btnPrint = document.getElementById('btnImprimirPdfViewer');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  const btnDescargar = document.getElementById('btnDescargarPdfViewer');
  if (btnDescargar) {
    btnDescargar.addEventListener('click', () => {
      const url = btnDescargar.dataset.url;
      const nombre = btnDescargar.dataset.nombre || 'contrato.pdf';
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        a.click();
      } else {
        const blob = new Blob(
          [
            `CONTRATO LABORAL - D&B ELECTRO METAL MECÁNICA S.A.C.\n\n` +
              `Trabajador: ${contrato.trabajador ? contrato.trabajador.nombres + ' ' + contrato.trabajador.apellidos : ''}\n` +
              `DNI: ${contrato.trabajador ? contrato.trabajador.dni : ''}\n` +
              `Cargo: ${contrato.trabajador ? contrato.trabajador.cargo : ''}\n` +
              `Fecha de Inicio: ${contrato.fechaInicio}\n` +
              `Fecha de Vencimiento: ${contrato.fechaVencimiento}\n` +
              `Archivo: ${contrato.nombreArchivo || 'contrato.pdf'}\n`
          ],
          { type: 'text/plain;charset=utf-8' }
        );
        const textUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = textUrl;
        a.download = `${contrato.nombreArchivo ? contrato.nombreArchivo.replace('.pdf', '') : 'contrato'}_detalles.txt`;
        a.click();
        URL.revokeObjectURL(textUrl);
      }
      toast(`Descargando ${nombre}...`, 'success');
    });
  }
}
