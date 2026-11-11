import { formatFecha, calcularDiasRestantes, getInitials, generateAvatarColor, escapeHTML, formatMoneda } from '../utils/helpers.js';

export function renderDocumentosView(container) {
  container.innerHTML = `
    <div class="db-section-header">
      <div>
        <h4><i class="bi bi-file-earmark-pdf-fill"></i> Contratos</h4>
        <p class="db-section-desc">Gestion y control de contratos laborales en PDF</p>
      </div>
      <div class="d-flex align-items-center gap-2">
        <select class="form-select db-form-control" id="filtroEstado" style="width: auto">
          <option value="">Todos los estados</option>
          <option value="AL_DIA">Vigentes</option>
          <option value="POR_VENCER">Por vencer</option>
          <option value="VENCIDO">Vencidos</option>
          <option value="SIN_PDF">Sin PDF</option>
        </select>
        <button class="btn-db-primary" id="btnNuevoContrato">
          <i class="bi bi-file-earmark-plus-fill me-1"></i> Nuevo Contrato
        </button>
      </div>
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
      ? `<button type="button" class="btn btn-sm btn-link p-0 text-decoration-none text-start btnVerPdf" data-id="${d.id}" title="Haga clic para ver el contrato">
           <div class="d-flex align-items-center gap-1">
             <i class="bi bi-file-earmark-pdf-fill text-danger"></i>
             <span style="font-size: 0.82rem; font-weight: 600; color: var(--db-primary);">${escapeHTML(d.nombreArchivo)}</span>
           </div>
           <div style="font-size: 0.74rem; color: var(--db-gray)">${d.tamanoKB ? (d.tamanoKB < 1024 ? d.tamanoKB + ' KB' : (d.tamanoKB / 1024).toFixed(1) + ' MB') : ''} · Ver PDF</div>
         </button>`
      : '<span style="font-size: 0.82rem; color: var(--db-gray)"><i class="bi bi-dash-circle me-1"></i>No subido</span>';

    const accionesBtn = d.nombreArchivo
      ? `<div class="db-action-buttons">
           <button class="db-action-btn db-action-expediente btnVerPdf" data-id="${d.id}" title="Ver documento PDF" aria-label="Ver documento PDF">
             <i class="bi bi-eye"></i><span>Ver</span>
           </button>
           <button class="db-action-btn db-action-edit btnSubirPdf" data-id="${d.id}" title="Editar fechas o reemplazar PDF" aria-label="Editar contrato">
             <i class="bi bi-pencil-square"></i><span>Editar</span>
           </button>
           <button class="db-action-btn db-action-delete btnEliminarPdf" data-id="${d.id}" title="Eliminar PDF" aria-label="Eliminar PDF">
             <i class="bi bi-trash"></i><span>Eliminar</span>
           </button>
         </div>`
      : `<div class="db-action-buttons">
           <button class="db-action-btn db-action-upload btnSubirPdf" data-id="${d.id}" title="Subir PDF" aria-label="Subir PDF">
             <i class="bi bi-cloud-arrow-up"></i><span>Subir PDF</span>
           </button>
         </div>`;

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="db-avatar" style="background: ${color}; width: 30px; height: 30px; font-size: 0.65rem">${escapeHTML(initials)}</div>
            <div>
              <div style="font-weight: 600; font-size: 0.92rem">${t ? escapeHTML(t.nombres + ' ' + t.apellidos) : '—'}</div>
              <div style="font-size: 0.8rem; color: var(--db-gray)">${t ? escapeHTML(t.cargo) : ''}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="db-badge bg-${d.estadoVariant} bg-opacity-10 text-${d.estadoVariant}">
            <i class="bi bi-${d.estadoIcon}"></i> ${escapeHTML(d.estadoLabel)}
          </span>
        </td>
        <td style="font-size: 0.86rem">${formatFecha(d.fechaInicio)}</td>
        <td style="font-size: 0.86rem">${formatFecha(d.fechaVencimiento)}</td>
        <td style="font-size: 0.86rem; font-weight: 600; color: ${diasColor}">${escapeHTML(diasText)}</td>
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

export function renderNuevoContratoModal(trabajadores = []) {
  const trabajadorOptions = trabajadores
    .map(
      (t) =>
        `<option value="${t.id}">${escapeHTML(t.nombres)} ${escapeHTML(t.apellidos)} · DNI ${escapeHTML(t.dni)} (${escapeHTML(t.cargo)})</option>`
    )
    .join('');

  return `
    <div class="modal fade" id="nuevoContratoModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="border: none; border-radius: 14px; box-shadow: 0 15px 35px rgba(27,39,51,0.12);">
          <div class="modal-header border-0 pb-0 pt-3 px-4">
            <div>
              <h5 class="modal-title mb-1 fw-bold text-dark">
                <i class="bi bi-file-earmark-plus text-primary me-2"></i>Registrar Nuevo Contrato
              </h5>
              <p class="text-muted mb-0" style="font-size: 0.82rem;">Asignar o renovar contrato laboral para un trabajador</p>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>

          <div class="modal-body px-4 py-3">
            <form id="nuevoContratoForm" novalidate>
              <div class="mb-3">
                <label class="db-form-label" for="ncTrabajador">Trabajador *</label>
                <select class="form-select db-form-control" id="ncTrabajador" required>
                  <option value="">Seleccione un trabajador...</option>
                  ${trabajadorOptions}
                </select>
                <div class="invalid-feedback">Seleccione un trabajador</div>
              </div>

              <div class="mb-3">
                <label class="db-form-label" for="ncTipo">Modalidad de Contratación</label>
                <select class="form-select db-form-control" id="ncTipo">
                  <option value="Plazo Fijo (Sujeto a Modalidad)">Plazo Fijo (Sujeto a Modalidad)</option>
                  <option value="Indeterminado / Indefinido">Indeterminado / Indefinido</option>
                  <option value="Por Obra o Servicio Específico">Por Obra o Servicio Específico</option>
                  <option value="Tiempo Parcial (Part-time)">Tiempo Parcial (Part-time)</option>
                </select>
              </div>

              <div class="row g-3 mb-3">
                <div class="col-6">
                  <label class="db-form-label" for="ncFechaInicio">Fecha de Inicio *</label>
                  <input type="date" class="form-control db-form-control" id="ncFechaInicio" required>
                  <div class="invalid-feedback">Ingrese fecha de inicio</div>
                </div>
                <div class="col-6">
                  <label class="db-form-label" for="ncFechaVencimiento">Fecha de Vencimiento *</label>
                  <input type="date" class="form-control db-form-control" id="ncFechaVencimiento" required>
                  <div class="invalid-feedback">Ingrese fecha de vencimiento</div>
                </div>
              </div>

              <div class="mb-2">
                <label class="db-form-label">Documento Digitalizado (PDF Opcional)</label>
                <div class="p-3 border rounded-3 text-center" style="background: var(--db-light); border-style: dashed !important; border-color: var(--db-border) !important; cursor: pointer;" id="ncDropZone">
                  <input type="file" id="ncPdfInput" accept=".pdf,application/pdf" hidden>
                  <i class="bi bi-cloud-arrow-up text-primary fs-3 d-block mb-1"></i>
                  <span class="d-block fw-semibold" style="font-size: 0.85rem;" id="ncFileTitle">Haga clic o arrastre el archivo PDF</span>
                  <span class="text-muted" style="font-size: 0.75rem;" id="ncFileSubtitle">Formato PDF · Máximo 10 MB</span>
                </div>
              </div>
            </form>
          </div>

          <div class="modal-footer border-0 pt-0 px-4 pb-3">
            <button type="button" class="btn btn-sm btn-db-outline px-3" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-sm btn-db-primary px-3" id="btnGuardarNuevoContrato">
              <i class="bi bi-check-lg me-1"></i> Registrar Contrato
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderPdfViewerModal(contrato) {
  const t = contrato.trabajador;
  const nombreTrabajador = t ? `${escapeHTML(t.nombres)} ${escapeHTML(t.apellidos)}` : 'Trabajador';
  const dni = t ? escapeHTML(t.dni) : '—';
  const cargo = t ? escapeHTML(t.cargo) : 'Operario';
  const salario = t ? formatMoneda(t.salarioBase) : 'S/ 0.00';
  const archivoNombre = escapeHTML(contrato.nombreArchivo || 'contrato_laboral.pdf');
  const fileUrl = contrato.fileUrl || null;

  return `
    <div class="modal fade" id="pdfViewerModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content" style="border: none; border-radius: 14px; box-shadow: 0 15px 35px rgba(27,39,51,0.12);">
          
          <!-- Header Minimalista del Visor -->
          <div class="modal-header border-bottom py-2 px-4 d-flex align-items-center justify-content-between" style="background: var(--db-light); border-color: var(--db-border) !important;">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-file-earmark-pdf-fill text-danger fs-4"></i>
              <div>
                <h6 class="mb-0 fw-bold text-dark" style="font-size: 0.95rem;">${archivoNombre}</h6>
                <div class="text-muted" style="font-size: 0.78rem;">
                  ${nombreTrabajador} · DNI: ${dni} · ${cargo} · Vigencia: ${formatFecha(contrato.fechaInicio)} al ${formatFecha(contrato.fechaVencimiento)}
                </div>
              </div>
            </div>

            <div class="d-flex align-items-center gap-1">
              <button type="button" class="btn btn-sm btn-light border text-secondary px-2 py-1" id="btnImprimirPdfViewer" title="Imprimir" style="border-radius: 8px;">
                <i class="bi bi-printer me-1"></i> Imprimir
              </button>
              <button type="button" class="btn btn-sm btn-primary px-2 py-1" id="btnDescargarPdfViewer" data-nombre="${archivoNombre}" data-url="${fileUrl || ''}" title="Descargar" style="border-radius: 8px;">
                <i class="bi bi-download me-1"></i> Descargar
              </button>
              <button type="button" class="btn-close ms-2" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
          </div>

          <!-- Cuerpo del Visor -->
          <div class="modal-body p-3 text-center" style="background: #525659; min-height: 580px;">
            ${
              fileUrl
                ? `
              <iframe src="${fileUrl}" style="width: 100%; height: 600px; border: none; border-radius: 8px; background: #fff;"></iframe>
            `
                : `
              <!-- Ficha Oficial del Contrato Maquetada en Alta Fidelidad -->
              <div class="mx-auto text-start p-4 p-md-5 rounded shadow-sm" style="max-width: 800px; background: #fff; color: #1b2733; font-family: 'Times New Roman', serif; line-height: 1.6;">
                <div class="text-center border-bottom pb-3 mb-4">
                  <h4 class="fw-bold mb-1" style="color: #0d4f8b; font-family: sans-serif; letter-spacing: 0.5px;">D&amp;B ELECTRO METAL MECÁNICA S.A.C.</h4>
                  <div style="font-size: 0.85rem; color: #5a6b7d; font-family: sans-serif;">R.U.C. N° 20601234567 · Planta Industrial y Taller Metalmecánico</div>
                  <h5 class="fw-bold text-uppercase mt-3 mb-0" style="text-decoration: underline; font-size: 1.05rem;">
                    CONTRATO INDIVIDUAL DE TRABAJO A PLAZO FIJO
                  </h5>
                  <div style="font-size: 0.85rem; font-style: italic;">(Sujeto a Modalidad por Inicio o Incremento de Actividad)</div>
                </div>

                <p style="font-size: 0.95rem; text-align: justify;">
                  Conste por el presente documento, el <strong>CONTRATO DE TRABAJO A PLAZO FIJO</strong> que celebran de una parte <strong>D&amp;B ELECTRO METAL MECÁNICA S.A.C.</strong>, en adelante <strong>EL EMPLEADOR</strong>, y de la otra parte don(ña) <strong>${nombreTrabajador}</strong>, identificado con D.N.I. N° <strong>${dni}</strong>, con domicilio registrado en <strong>${escapeHTML(t?.direccion || 'Ciudad')}</strong>, en adelante <strong>EL TRABAJADOR</strong>, en los términos y condiciones siguientes:
                </p>

                <h6 class="fw-bold mt-3" style="font-size: 0.95rem;">CLÁUSULA PRIMERA: OBJETO DEL CONTRATO</h6>
                <p style="font-size: 0.95rem; text-align: justify;">
                  EL EMPLEADOR contrata los servicios de EL TRABAJADOR para que desempeñe el puesto y las labores propias del cargo de <strong>${cargo}</strong> en las instalaciones del taller de operaciones y montaje metalmecánico.
                </p>

                <h6 class="fw-bold mt-3" style="font-size: 0.95rem;">CLÁUSULA SEGUNDA: PLAZO DE VIGENCIA</h6>
                <p style="font-size: 0.95rem; text-align: justify;">
                  El presente contrato rige a partir del <strong>${formatFecha(contrato.fechaInicio)}</strong> y concluirá indefectiblemente el <strong>${formatFecha(contrato.fechaVencimiento)}</strong>, fecha en la cual terminará la relación laboral sin necesidad de preaviso alguno.
                </p>

                <h6 class="fw-bold mt-3" style="font-size: 0.95rem;">CLÁUSULA TERCERA: REMUNERACIÓN Y CONDICIONES</h6>
                <p style="font-size: 0.95rem; text-align: justify;">
                  EL TRABAJADOR percibirá una remuneración mensual de <strong>${salario}</strong>, sujeta a los descuentos de ley (AFP/ONP, EsSalud). La jornada laboral se sujetará al horario oficial de planta de lunes a sábado según el registro diario de asistencia.
                </p>

                <div class="row pt-5 mt-4 text-center" style="font-size: 0.9rem;">
                  <div class="col-6">
                    <div class="border-top pt-2 mx-auto" style="width: 220px; border-color: #333 !important;">
                      <strong>D&amp;B ELECTRO METAL</strong><br>
                      <span style="font-size: 0.8rem; color: #666;">Gerencia General / RR.HH.</span>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="border-top pt-2 mx-auto" style="width: 220px; border-color: #333 !important;">
                      <strong>${nombreTrabajador}</strong><br>
                      <span style="font-size: 0.8rem; color: #666;">DNI N° ${dni}</span>
                    </div>
                  </div>
                </div>

                <div class="text-center mt-4 pt-3 border-top" style="font-size: 0.75rem; color: #888; font-family: sans-serif;">
                  <i class="bi bi-shield-check text-success me-1"></i> Documento digitalizado y registrado en el Legajo de Personal de D&amp;B Electro Metal Mecánica
                </div>
              </div>
            `
            }
          </div>

          <div class="modal-footer border-0 py-2 px-4" style="background: var(--db-light);">
            <button type="button" class="btn btn-sm btn-db-outline px-3" data-bs-dismiss="modal">Cerrar Visor</button>
          </div>

        </div>
      </div>
    </div>
  `;
}
