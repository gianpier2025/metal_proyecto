import { formatFecha, calcularDiasRestantes, getInitials, generateAvatarColor } from '../utils/helpers.js';

export function renderDocumentosView(container) {
  container.innerHTML = `
    <div class="db-section-header">
      <div>
        <h4><i class="bi bi-file-earmark-pdf-fill"></i> Contratos</h4>
        <p class="db-section-desc">Gestion y control de contratos laborales en PDF</p>
      </div>
      <select class="form-select db-form-control" id="filtroEstado" style="width: auto">
        <option value="">Todos los estados</option>
        <option value="AL_DIA">Vigentes</option>
        <option value="POR_VENCER">Por vencer</option>
        <option value="VENCIDO">Vencidos</option>
        <option value="SIN_PDF">Sin PDF</option>
      </select>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-6 col-lg-3">
        <div class="db-stat-card" style="padding: 1rem 1.15rem">
          <div class="db-stat-icon success" style="width: 38px; height: 38px; font-size: 1.05rem"><i class="bi bi-check-circle"></i></div>
          <div><div class="db-stat-value" style="font-size: 1.3rem" id="cntAlDia">0</div><div class="db-stat-label">Vigentes</div></div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="db-stat-card" style="padding: 1rem 1.15rem">
          <div class="db-stat-icon warning" style="width: 38px; height: 38px; font-size: 1.05rem"><i class="bi bi-exclamation-triangle"></i></div>
          <div><div class="db-stat-value" style="font-size: 1.3rem" id="cntPorVencer">0</div><div class="db-stat-label">Por vencer</div></div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="db-stat-card" style="padding: 1rem 1.15rem">
          <div class="db-stat-icon danger" style="width: 38px; height: 38px; font-size: 1.05rem"><i class="bi bi-x-circle"></i></div>
          <div><div class="db-stat-value" style="font-size: 1.3rem" id="cntVencido">0</div><div class="db-stat-label">Vencidos</div></div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="db-stat-card" style="padding: 1rem 1.15rem">
          <div class="db-stat-icon secondary" style="width: 38px; height: 38px; font-size: 1.05rem"><i class="bi bi-file-earmark-excel"></i></div>
          <div><div class="db-stat-value" style="font-size: 1.3rem" id="cntSinPdf">0</div><div class="db-stat-label">Sin PDF</div></div>
        </div>
      </div>
    </div>

    <div class="db-card">
      <div class="db-card-header">
        <h5><i class="bi bi-files text-primary me-2"></i>Contratos del Personal</h5>
        <div class="db-search-wrapper">
          <i class="bi bi-search"></i>
          <input type="text" class="db-search-input" id="searchDoc" placeholder="Buscar por trabajador...">
        </div>
      </div>
      <div class="db-card-body" style="padding: 0">
        <div class="table-responsive">
          <table class="table db-table mb-0">
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Estado</th>
                <th>Inicio</th>
                <th>Vencimiento</th>
                <th>Dias Restantes</th>
                <th>PDF</th>
                <th class="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody id="tbodyDocumentos"></tbody>
          </table>
        </div>
        <div id="docsEmpty" class="db-empty d-none">
          <i class="bi bi-folder2-open"></i>
          <p>No se encontraron contratos</p>
        </div>
      </div>
    </div>
  `;
}

export function renderDocumentosTable(tbody, emptyEl, documentos) {
  if (!documentos.length) {
    tbody.innerHTML = '';
    emptyEl.classList.remove('d-none');
    return;
  }
  emptyEl.classList.add('d-none');

  tbody.innerHTML = documentos.map((d) => {
    const t = d.trabajador;
    const color = t ? generateAvatarColor(t.nombres) : '#0d4f8b';
    const initials = t ? getInitials(t.nombres, t.apellidos) : '?';
    const dias = calcularDiasRestantes(d.fechaVencimiento);

    let diasText = '\u2014';
    let diasColor = 'var(--db-gray)';
    if (d.estadoKey === 'SIN_PDF') {
      diasText = 'Sin fecha';
    } else if (dias !== null) {
      if (dias < 0) { diasText = Math.abs(dias) + ' dias atras'; diasColor = 'var(--db-danger)'; }
      else if (dias === 0) { diasText = 'Hoy'; diasColor = 'var(--db-danger)'; }
      else if (dias <= 30) { diasText = dias + ' dias'; diasColor = 'var(--db-warning)'; }
      else { diasText = dias + ' dias'; diasColor = 'var(--db-success)'; }
    }

    const pdfCell = d.nombreArchivo
      ? `<div class="d-flex align-items-center gap-1">
           <i class="bi bi-file-earmark-pdf-fill text-danger"></i>
           <span style="font-size: 0.82rem; font-weight: 500">${d.nombreArchivo}</span>
         </div>
         <div style="font-size: 0.74rem; color: var(--db-gray)">${d.tamanoKB ? (d.tamanoKB < 1024 ? d.tamanoKB + ' KB' : (d.tamanoKB / 1024).toFixed(1) + ' MB') : ''}</div>`
      : '<span style="font-size: 0.85rem; color: var(--db-gray)">No subido</span>';

    const accionesBtn = d.nombreArchivo
      ? `<div class="db-action-buttons">
           <button class="db-action-btn db-action-edit btnSubirPdf" data-id="${d.id}" title="Editar contrato" aria-label="Editar contrato"><i class="bi bi-pencil-square"></i><span>Editar</span></button>
           <button class="db-action-btn db-action-delete btnEliminarPdf" data-id="${d.id}" title="Eliminar PDF" aria-label="Eliminar PDF"><i class="bi bi-trash"></i><span>Eliminar</span></button>
         </div>`
      : `<div class="db-action-buttons">
           <button class="db-action-btn db-action-upload btnSubirPdf" data-id="${d.id}" title="Subir PDF" aria-label="Subir PDF"><i class="bi bi-cloud-arrow-up"></i><span>Subir PDF</span></button>
         </div>`;

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="db-avatar" style="background: ${color}; width: 30px; height: 30px; font-size: 0.65rem">${initials}</div>
            <div>
              <div style="font-weight: 600; font-size: 0.92rem">${t ? t.nombres + ' ' + t.apellidos : '\u2014'}</div>
              <div style="font-size: 0.8rem; color: var(--db-gray)">${t ? t.cargo : ''}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="db-badge bg-${d.estadoVariant} bg-opacity-10 text-${d.estadoVariant}">
            <i class="bi bi-${d.estadoIcon}"></i> ${d.estadoLabel}
          </span>
        </td>
        <td style="font-size: 0.86rem">${formatFecha(d.fechaInicio)}</td>
        <td style="font-size: 0.86rem">${formatFecha(d.fechaVencimiento)}</td>
        <td style="font-size: 0.86rem; font-weight: 600; color: ${diasColor}">${diasText}</td>
        <td>${pdfCell}</td>
        <td class="text-end">${accionesBtn}</td>
      </tr>
    `;
  }).join('');
}

export function renderUploadModal(contrato) {
  const t = contrato.trabajador;
  const tienePdf = !!contrato.nombreArchivo;

  return `
    <div class="modal fade" id="uploadPdfModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-cloud-arrow-up text-primary me-2"></i>${tienePdf ? 'Reemplar PDF del Contrato' : 'Subir PDF del Contrato'}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3 d-flex align-items-center gap-2 p-2 rounded" style="background: var(--db-light)">
              <div class="db-avatar" style="background: ${generateAvatarColor(t?.nombres || '?')}; width: 32px; height: 32px; font-size: 0.68rem">${t ? getInitials(t.nombres, t.apellidos) : '?'}</div>
              <div>
                <div style="font-weight: 600; font-size: 0.92rem">${t ? t.nombres + ' ' + t.apellidos : '\u2014'}</div>
                <div style="font-size: 0.8rem; color: var(--db-gray)">${t ? t.cargo : ''}</div>
              </div>
            </div>

            ${tienePdf ? `
              <div class="d-flex align-items-center justify-content-between p-2 rounded mb-3" style="background: rgba(192,57,43,0.06); border: 1px solid rgba(192,57,43,0.15)">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-file-earmark-pdf-fill text-danger" style="font-size: 1.3rem"></i>
                  <div>
                    <div style="font-size: 0.88rem; font-weight: 600">${contrato.nombreArchivo}</div>
                    <div style="font-size: 0.76rem; color: var(--db-gray)">${contrato.tamanoKB ? (contrato.tamanoKB < 1024 ? contrato.tamanoKB + ' KB' : (contrato.tamanoKB / 1024).toFixed(1) + ' MB') : ''} · Subido: ${formatFecha(contrato.fechaSubida)}</div>
                  </div>
                </div>
                <button class="btn btn-sm btn-link text-danger p-1" id="btnQuitarActual" title="Quitar actual"><i class="bi bi-x-circle"></i></button>
              </div>
            ` : ''}

            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="db-form-label" for="fechaInicioContrato">Fecha de Inicio del Contrato</label>
                <input type="date" class="form-control db-form-control" id="fechaInicioContrato" value="${contrato.fechaInicio || ''}">
              </div>
              <div class="col-md-6">
                <label class="db-form-label" for="fechaVencimientoContrato">Fecha de Vencimiento</label>
                <input type="date" class="form-control db-form-control" id="fechaVencimientoContrato" value="${contrato.fechaVencimiento || ''}">
                <div style="font-size: 0.78rem; color: var(--db-gray); margin-top: 0.25rem">Se usa para calcular los dias restantes</div>
              </div>
            </div>

            <div id="dropZone" class="db-dropzone">
              <input type="file" id="pdfFileInput" accept=".pdf,application/pdf" hidden>
              <i class="bi bi-cloud-arrow-up"></i>
              <p class="db-dropzone-title">Arrastre el archivo PDF aqui</p>
              <p class="db-dropzone-subtitle">o haga clic para seleccionar</p>
              <span class="db-dropzone-hint">Formato: PDF · Maximo 10 MB</span>
            </div>

            <div id="filePreview" class="db-file-preview d-none">
              <i class="bi bi-file-earmark-pdf-fill text-danger"></i>
              <div class="flex-grow-1 min-w-0">
                <div class="db-file-name" id="fileName"></div>
                <div class="db-file-size" id="fileSize"></div>
              </div>
              <button class="btn btn-sm btn-link text-danger p-0" id="btnClearFile"><i class="bi bi-x-circle"></i></button>
            </div>

            <div id="uploadError" class="alert alert-danger d-none mt-2" style="font-size: 0.8rem; padding: 0.5rem 0.8rem"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-db-outline" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn-db-primary" id="btnConfirmUpload" disabled>
              <i class="bi bi-check-lg me-1"></i> ${tienePdf ? 'Reemplar' : 'Subir'} PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
