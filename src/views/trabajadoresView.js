import { CARGOS, ESTADOS_TRABAJADOR } from '../config.js';
import { getInitials, generateAvatarColor, formatFecha } from '../utils/helpers.js';

export function renderTrabajadoresView(container) {
  container.innerHTML = `
    <div class="db-section-header">
      <div>
        <h4><i class="bi bi-people-fill"></i> Registro de Personal</h4>
        <p class="db-section-desc">Gestión de trabajadores del taller</p>
      </div>
      <button class="btn-db-primary" id="btnNuevoTrabajador">
        <i class="bi bi-person-plus-fill me-1"></i> Nuevo Trabajador
      </button>
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

export function renderTrabajadoresTable(tbody, emptyEl, trabajadores) {
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
            <div class="db-avatar" style="background: ${color}">${initials}</div>
            <div>
              <div style="font-weight: 600; font-size: 0.92rem">${t.nombres} ${t.apellidos}</div>
              <div style="font-size: 0.8rem; color: var(--db-gray)">${t.email}</div>
            </div>
          </div>
        </td>
        <td style="font-weight: 500; font-size: 0.88rem">${t.dni}</td>
        <td>${t.cargo}</td>
        <td><span class="db-badge bg-${estadoVariant} bg-opacity-10 text-${estadoVariant}">${t.estado}</span></td>
        <td style="font-size: 0.86rem">${formatFecha(t.fechaIngreso)}</td>
        <td class="text-end">
          <div class="db-action-buttons">
            <button class="db-action-btn db-action-edit btnEditar" data-id="${t.id}" title="Editar trabajador" aria-label="Editar trabajador">
              <i class="bi bi-pencil-square"></i><span>Editar</span>
            </button>
            <button class="db-action-btn db-action-delete btnEliminar" data-id="${t.id}" title="Eliminar trabajador" aria-label="Eliminar trabajador">
              <i class="bi bi-trash"></i><span>Eliminar</span>
            </button>
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
                  <input type="number" class="form-control db-form-control" id="trTarifa" min="0" step="0.50" value="${trabajador?.tarifaPorHora ?? ''}" placeholder="0 = auto">
                  <div style="font-size: 0.78rem; color: var(--db-gray); margin-top: 0.25rem">Si es 0, se calcula del salario base</div>
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
