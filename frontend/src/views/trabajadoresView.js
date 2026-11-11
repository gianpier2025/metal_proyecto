import { CARGOS, ESTADOS_TRABAJADOR } from '../config.js';
import {
  getInitials,
  generateAvatarColor,
  formatFecha,
  formatHora,
  formatMoneda,
  formatHoras,
  formatAntiguedad,
  calcularDiasRestantes,
  calcularHorasRegistro,
  escapeHTML,
} from '../utils/helpers.js';

export function renderTrabajadoresView(container, canManage = true) {
  container.innerHTML = `
    <div class="db-section-header">
      <div>
        <h4><i class="bi bi-people-fill"></i> Registro de Personal</h4>
        <p class="db-section-desc">Gestión de trabajadores del taller</p>
      </div>
      ${canManage ? `<button class="btn-db-primary" id="btnNuevoTrabajador">
        <i class="bi bi-person-plus-fill me-1"></i> Nuevo Trabajador
      </button>` : ''}
    </div>

    <div class="db-card">
      <div class="db-card-header">
        <h5><i class="bi bi-list-ul text-primary me-2"></i>Listado de Operarios</h5>
        <div class="db-search-wrapper">
          <i class="bi bi-search"></i>
          <input type="text" class="db-search-input" id="searchTrabajador" placeholder="Buscar por nombre, DNI o cargo...">
        </div>
      </div>
      <div class="db-card-body" style="padding: 0">
        <div class="table-responsive">
          <table class="table db-table mb-0">
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>DNI</th>
                <th>Cargo</th>
                <th>Estado</th>
                <th>F. Ingreso</th>
                <th class="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody id="tbodyTrabajadores"></tbody>
          </table>
        </div>
        <div id="trabajadoresEmpty" class="db-empty d-none">
          <i class="bi bi-search"></i>
          <p>No se encontraron trabajadores</p>
        </div>
      </div>
    </div>
  `;
}

export function renderTrabajadoresTable(tbody, emptyEl, trabajadores, canManage = true) {
  if (!trabajadores.length) {
    tbody.innerHTML = '';
    emptyEl.classList.remove('d-none');
    return;
  }
  emptyEl.classList.add('d-none');

  tbody.innerHTML = trabajadores.map((t) => {
    const color = generateAvatarColor(t.nombres);
    const initials = getInitials(t.nombres, t.apellidos);
    const estadoVariant = t.estado === 'Activo' ? 'success' : t.estado === 'En Licencia' ? 'warning' : 'secondary';

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="db-avatar" style="background: ${color}">${escapeHTML(initials)}</div>
            <div>
              <div style="font-weight: 600; font-size: 0.92rem">${escapeHTML(t.nombres)} ${escapeHTML(t.apellidos)}</div>
              <div style="font-size: 0.8rem; color: var(--db-gray)">${escapeHTML(t.email)}</div>
            </div>
          </div>
        </td>
        <td style="font-weight: 500; font-size: 0.88rem">${escapeHTML(t.dni)}</td>
        <td>${escapeHTML(t.cargo)}</td>
        <td><span class="db-badge bg-${estadoVariant} bg-opacity-10 text-${estadoVariant}">${escapeHTML(t.estado)}</span></td>
        <td style="font-size: 0.86rem">${formatFecha(t.fechaIngreso)}</td>
        <td class="text-end">
          <div class="db-action-buttons">
            <button class="db-action-btn db-action-expediente btnExpediente" data-id="${t.id}" title="Ver expediente laboral" aria-label="Ver expediente laboral">
              <i class="bi bi-folder2-open"></i><span>Expediente</span>
            </button>
            ${canManage ? `<button class="db-action-btn db-action-edit btnEditar" data-id="${t.id}" title="Editar trabajador" aria-label="Editar trabajador">
              <i class="bi bi-pencil-square"></i><span>Editar</span>
            </button>
            <button class="db-action-btn db-action-delete btnEliminar" data-id="${t.id}" title="Eliminar trabajador" aria-label="Eliminar trabajador">
              <i class="bi bi-trash"></i><span>Eliminar</span>
            </button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

export function renderTrabajadorModal(isEdit = false, trabajador = null) {
  const title = isEdit ? 'Editar Trabajador' : 'Registrar Nuevo Trabajador';
  const cargoOptions = CARGOS.map((c) =>
    `<option value="${c}" ${trabajador?.cargo === c ? 'selected' : ''}>${c}</option>`
  ).join('');
  const estadoOptions = Object.values(ESTADOS_TRABAJADOR).map((s) =>
    `<option value="${s}" ${trabajador?.estado === s ? 'selected' : ''}>${s}</option>`
  ).join('');

  return `
    <div class="modal fade" id="trabajadorModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-${isEdit ? 'pencil' : 'person-plus'} text-primary me-2"></i>${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            <form id="trabajadorForm" novalidate>
              <input type="hidden" id="trabajadorId" value="${trabajador?.id ?? ''}">

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="db-form-label" for="trNombres">Nombres <span class="text-danger">*</span></label>
                  <input type="text" class="form-control db-form-control" id="trNombres" value="${trabajador?.nombres ?? ''}" required>
                  <div class="invalid-feedback">Ingrese los nombres</div>
                </div>
                <div class="col-md-6">
                  <label class="db-form-label" for="trApellidos">Apellidos <span class="text-danger">*</span></label>
                  <input type="text" class="form-control db-form-control" id="trApellidos" value="${trabajador?.apellidos ?? ''}" required>
                  <div class="invalid-feedback">Ingrese los apellidos</div>
                </div>
              </div>

              <div class="row g-3 mt-0">
                <div class="col-md-4">
                  <label class="db-form-label" for="trDni">DNI <span class="text-danger">*</span></label>
                  <input type="text" class="form-control db-form-control" id="trDni" maxlength="8" pattern="[0-9]{8}" value="${trabajador?.dni ?? ''}" placeholder="12345678" required>
                  <div class="invalid-feedback">DNI debe tener 8 dígitos</div>
                </div>
                <div class="col-md-4">
                  <label class="db-form-label" for="trCargo">Cargo <span class="text-danger">*</span></label>
                  <select class="form-select db-form-control" id="trCargo" required>
                    <option value="">Seleccionar...</option>
                    ${cargoOptions}
                  </select>
                  <div class="invalid-feedback">Seleccione un cargo</div>
                </div>
                <div class="col-md-4">
                  <label class="db-form-label" for="trEstado">Estado</label>
                  <select class="form-select db-form-control" id="trEstado">
                    ${estadoOptions}
                  </select>
                </div>
              </div>

              <div class="row g-3 mt-0">
                <div class="col-md-6">
                  <label class="db-form-label" for="trTelefono">Teléfono</label>
                  <input type="tel" class="form-control db-form-control" id="trTelefono" value="${trabajador?.telefono ?? ''}" placeholder="999999999">
                </div>
                <div class="col-md-6">
                  <label class="db-form-label" for="trEmail">Correo Electrónico</label>
                  <input type="email" class="form-control db-form-control" id="trEmail" value="${trabajador?.email ?? ''}" placeholder="nombre@dbelecmec.com">
                  <div class="invalid-feedback">Ingrese un correo válido</div>
                </div>
              </div>

              <div class="row g-3 mt-0">
                <div class="col-md-4">
                  <label class="db-form-label" for="trFechaIngreso">Fecha de Ingreso</label>
                  <input type="date" class="form-control db-form-control" id="trFechaIngreso" value="${trabajador?.fechaIngreso ?? ''}">
                </div>
                <div class="col-md-4">
                  <label class="db-form-label" for="trSalario">Salario Base (S/)</label>
                  <input type="number" class="form-control db-form-control" id="trSalario" min="0" step="50" value="${trabajador?.salarioBase ?? ''}" placeholder="1500">
                </div>
                <div class="col-md-4">
                  <label class="db-form-label" for="trTarifa">Tarifa por Hora (S/)</label>
                  <input type="number" class="form-control db-form-control" id="trTarifa" min="0" step="0.01" value="${trabajador?.tarifaPorHora ?? ''}" placeholder="Ej. 35.50" required>
                  <div class="invalid-feedback">Ingrese la tarifa por hora acordada</div>
                </div>
              </div>

              <div class="mt-3">
                <label class="db-form-label" for="trDireccion">Dirección</label>
                <input type="text" class="form-control db-form-control" id="trDireccion" value="${trabajador?.direccion ?? ''}" placeholder="Av. / Jr. / Calle, distrito">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-db-outline" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn-db-primary" id="btnGuardarTrabajador">
              <i class="bi bi-check-lg me-1"></i> ${isEdit ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderExpedienteModal(trabajador, contrato = null, asistencias = [], metricas = {}, canManage = true) {
  const color = generateAvatarColor(trabajador.nombres);
  const initials = getInitials(trabajador.nombres, trabajador.apellidos);
  const estadoVariant =
    trabajador.estado === 'Activo'
      ? 'success'
      : trabajador.estado === 'En Licencia'
      ? 'warning'
      : 'secondary';

  const diasRestantes = contrato?.fechaVencimiento
    ? calcularDiasRestantes(contrato.fechaVencimiento)
    : null;

  let estadoContratoLabel = 'Sin Contrato';
  let estadoContratoVariant = 'secondary';

  if (contrato) {
    if (!contrato.nombreArchivo) {
      estadoContratoLabel = 'Sin PDF';
      estadoContratoVariant = 'warning';
    } else if (diasRestantes !== null) {
      if (diasRestantes < 0) {
        estadoContratoLabel = `Vencido (${Math.abs(diasRestantes)}d)`;
        estadoContratoVariant = 'danger';
      } else if (diasRestantes <= 30) {
        estadoContratoLabel = `Por vencer (${diasRestantes}d)`;
        estadoContratoVariant = 'warning';
      } else {
        estadoContratoLabel = `Vigente (${diasRestantes}d)`;
        estadoContratoVariant = 'success';
      }
    }
  }

  const asistenciasRows = asistencias.length
    ? asistencias
        .map((a) => {
          const horas = calcularHorasRegistro(a.horaEntrada, a.horaSalida);
          const esPuntual = a.horaEntrada ? a.horaEntrada <= '07:15' : false;
          return `
            <tr class="border-bottom" style="border-color: var(--db-border-light) !important;">
              <td class="fw-medium">${formatFecha(a.fecha)}</td>
              <td class="text-muted">${formatHora(a.horaEntrada)}</td>
              <td class="text-muted">${formatHora(a.horaSalida)}</td>
              <td class="fw-semibold">${formatHoras(horas)}</td>
              <td>
                <span class="db-badge bg-${esPuntual ? 'success' : 'warning'} bg-opacity-10 text-${
            esPuntual ? 'success' : 'warning'
          }" style="font-size: 0.68rem; padding: 0.2rem 0.45rem;">
                  ${esPuntual ? 'Puntual' : 'Tardanza'}
                </span>
              </td>
            </tr>
          `;
        })
        .join('')
    : `
      <tr>
        <td colspan="5" class="text-center py-4 text-muted" style="font-size: 0.82rem;">
          <i class="bi bi-calendar-x d-block mb-1 fs-5 text-secondary opacity-50"></i>
          Sin registros de asistencia
        </td>
      </tr>
    `;

  return `
    <div class="modal fade" id="expedienteModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content" style="border: none; border-radius: 14px; box-shadow: 0 15px 35px rgba(27,39,51,0.12);">
          
          <!-- Header Minimalista y Limpio -->
          <div class="modal-header border-0 pb-0 pt-3 px-4 align-items-start">
            <div class="d-flex align-items-center gap-3">
              <div class="db-avatar" style="background: ${color}; width: 48px; height: 48px; font-size: 1.05rem; font-weight: 700; border-radius: 12px;">
                ${escapeHTML(initials)}
              </div>
              <div>
                <div class="d-flex align-items-center gap-2">
                  <h5 class="mb-0 fw-bold" style="color: var(--db-dark); font-size: 1.15rem;">
                    ${escapeHTML(trabajador.nombres)} ${escapeHTML(trabajador.apellidos)}
                  </h5>
                  <span class="db-badge bg-${estadoVariant} bg-opacity-10 text-${estadoVariant}" style="font-size: 0.72rem;">
                    ${escapeHTML(trabajador.estado)}
                  </span>
                </div>
                <div class="text-muted" style="font-size: 0.82rem; margin-top: 0.15rem;">
                  <span>${escapeHTML(trabajador.cargo)}</span>
                  <span class="mx-1">·</span>
                  <span>DNI ${escapeHTML(trabajador.dni)}</span>
                  <span class="mx-1">·</span>
                  <span>${formatAntiguedad(trabajador.fechaIngreso)}</span>
                </div>
              </div>
            </div>

            <!-- Acciones Rápidas -->
            <div class="d-flex align-items-center gap-1">
              <button type="button" class="btn btn-sm btn-light border-0 text-secondary" id="btnImprimirExpediente" title="Imprimir Expediente" style="border-radius: 8px; width: 34px; height: 34px; padding: 0;">
                <i class="bi bi-printer"></i>
              </button>
              ${canManage ? `<button type="button" class="btn btn-sm btn-light border-0 text-primary btnEditarDesdeExpediente" data-id="${trabajador.id}" title="Editar Trabajador" style="border-radius: 8px; width: 34px; height: 34px; padding: 0;">
                <i class="bi bi-pencil-square"></i>
              </button>` : ''}
              <button type="button" class="btn-close ms-1" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
          </div>

          <!-- Body Unificado en 2 Columnas Escaneables -->
          <div class="modal-body px-4 py-3">
            <div class="row g-3">
              
              <!-- Columna Izquierda: Ficha y Contrato -->
              <div class="col-md-5 d-flex flex-column gap-3">
                
                <!-- Datos de Contacto y Empleo -->
                <div class="p-3 rounded-3 border" style="background: var(--db-light); border-color: var(--db-border) !important; font-size: 0.84rem;">
                  <div class="text-uppercase text-muted fw-bold mb-2" style="font-size: 0.68rem; letter-spacing: 0.5px;">Contacto & Nómina</div>
                  
                  <div class="d-flex justify-content-between py-1 border-bottom" style="border-color: var(--db-border-light) !important;">
                    <span class="text-muted">Teléfono</span>
                    <span class="fw-semibold">${escapeHTML(trabajador.telefono || '—')}</span>
                  </div>
                  <div class="d-flex justify-content-between py-1 border-bottom" style="border-color: var(--db-border-light) !important;">
                    <span class="text-muted">Correo</span>
                    <span class="fw-semibold text-truncate ms-2" style="max-width: 140px;" title="${escapeHTML(trabajador.email || '')}">${escapeHTML(trabajador.email || '—')}</span>
                  </div>
                  <div class="d-flex justify-content-between py-1 border-bottom" style="border-color: var(--db-border-light) !important;">
                    <span class="text-muted">Dirección</span>
                    <span class="fw-semibold text-truncate ms-2 text-end" style="max-width: 140px;" title="${escapeHTML(trabajador.direccion || '')}">${escapeHTML(trabajador.direccion || '—')}</span>
                  </div>
                  <div class="d-flex justify-content-between py-1 border-bottom" style="border-color: var(--db-border-light) !important;">
                    <span class="text-muted">Ingreso</span>
                    <span class="fw-semibold">${formatFecha(trabajador.fechaIngreso)}</span>
                  </div>
                  <div class="d-flex justify-content-between py-1 border-bottom" style="border-color: var(--db-border-light) !important;">
                    <span class="text-muted">Salario Base</span>
                    <span class="fw-bold text-success">${formatMoneda(trabajador.salarioBase)}</span>
                  </div>
                  <div class="d-flex justify-content-between py-1">
                    <span class="text-muted">Tarifa Hora</span>
                    <span class="fw-semibold">${formatMoneda(trabajador.tarifaPorHora)}</span>
                  </div>
                </div>

                <!-- Contrato Actual -->
                <div class="p-3 rounded-3 border" style="background: var(--db-light); border-color: var(--db-border) !important; font-size: 0.84rem;">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="text-uppercase text-muted fw-bold" style="font-size: 0.68rem; letter-spacing: 0.5px;">Contrato Laboral</span>
                    <span class="db-badge bg-${estadoContratoVariant} bg-opacity-10 text-${estadoContratoVariant}">
                      ${estadoContratoLabel}
                    </span>
                  </div>

                  <div class="d-flex justify-content-between py-1 border-bottom" style="border-color: var(--db-border-light) !important;">
                    <span class="text-muted">Inicio</span>
                    <span class="fw-semibold">${formatFecha(contrato?.fechaInicio)}</span>
                  </div>
                  <div class="d-flex justify-content-between py-1">
                    <span class="text-muted">Vencimiento</span>
                    <span class="fw-semibold">${formatFecha(contrato?.fechaVencimiento)}</span>
                  </div>

                  ${
                    contrato?.nombreArchivo
                      ? `
                    <div class="mt-2 pt-2 border-top d-flex align-items-center justify-content-between" style="border-color: var(--db-border-light) !important;">
                      <div class="d-flex align-items-center gap-2 text-truncate" style="font-size: 0.8rem;">
                        <i class="bi bi-file-earmark-pdf-fill text-danger"></i>
                        <span class="text-truncate" style="max-width: 130px;" title="${escapeHTML(contrato.nombreArchivo)}">${escapeHTML(contrato.nombreArchivo)}</span>
                      </div>
                      <button class="btn btn-sm btn-link p-0 text-primary text-decoration-none fw-semibold" id="btnDescargarPdfExpediente" data-nombre="${escapeHTML(contrato.nombreArchivo)}" style="font-size: 0.78rem;">
                        <i class="bi bi-download me-1"></i>PDF
                      </button>
                    </div>
                  `
                      : `
                    <div class="mt-2 pt-2 border-top text-muted" style="border-color: var(--db-border-light) !important; font-size: 0.76rem;">
                      <i class="bi bi-file-earmark-x me-1"></i> Sin PDF digitalizado
                    </div>
                  `
                  }
                </div>

              </div>

              <!-- Columna Derecha: Métricas y Asistencia -->
              <div class="col-md-7 d-flex flex-column">
                
                <!-- KPIs Rápidos en 1 Fila -->
                <div class="d-flex gap-2 mb-3 p-2 rounded-3 border" style="background: var(--db-light); border-color: var(--db-border) !important;">
                  <div class="flex-grow-1 text-center py-1">
                    <div class="text-muted" style="font-size: 0.7rem;">Jornadas</div>
                    <div class="fw-bold text-dark" style="font-size: 1.05rem;">${metricas.diasRegistrados || 0}</div>
                  </div>
                  <div class="border-end" style="border-color: var(--db-border) !important;"></div>
                  <div class="flex-grow-1 text-center py-1">
                    <div class="text-muted" style="font-size: 0.7rem;">Horas Acumuladas</div>
                    <div class="fw-bold text-dark" style="font-size: 1.05rem;">${formatHoras(metricas.totalHoras || 0)}</div>
                  </div>
                  <div class="border-end" style="border-color: var(--db-border) !important;"></div>
                  <div class="flex-grow-1 text-center py-1">
                    <div class="text-muted" style="font-size: 0.7rem;">Puntualidad</div>
                    <div class="fw-bold text-success" style="font-size: 1.05rem;">${metricas.puntualidad || 0}%</div>
                  </div>
                </div>

                <!-- Tabla de Asistencias Limpia y Compacta -->
                <div class="d-flex justify-content-between align-items-center mb-1 px-1">
                  <span class="text-uppercase text-muted fw-bold" style="font-size: 0.68rem; letter-spacing: 0.5px;">Registro de Asistencias</span>
                  <span class="text-muted" style="font-size: 0.75rem;">${asistencias.length} registros</span>
                </div>

                <div class="table-responsive flex-grow-1 border rounded-3" style="max-height: 250px; overflow-y: auto; background: #fff; border-color: var(--db-border) !important;">
                  <table class="table table-sm table-hover align-middle mb-0" style="font-size: 0.82rem;">
                    <thead class="sticky-top" style="background: var(--db-light); font-size: 0.72rem; color: var(--db-gray);">
                      <tr>
                        <th>FECHA</th>
                        <th>ENTRADA</th>
                        <th>SALIDA</th>
                        <th>HORAS</th>
                        <th>ESTADO</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${asistenciasRows}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          </div>

          <!-- Footer Minimalista -->
          <div class="modal-footer border-0 pt-0 px-4 pb-3">
            <button type="button" class="btn btn-sm btn-db-outline px-3" data-bs-dismiss="modal">
              Cerrar
            </button>
          </div>

        </div>
      </div>
    </div>
  `;
}
