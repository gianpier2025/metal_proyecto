import {
  getInitials,
  generateAvatarColor,
  formatHora,
  getCurrentDateTime,
  formatMoneda,
  formatHoras,
  todayISO,
} from '../utils/helpers.js';

export function renderAsistenciaView(container, resumen, registrosHoy, selectedDate = todayISO()) {
  const totalActivos = resumen.totalActivos;
  const presentes = resumen.presentes;
  const faltantes = resumen.faltantes;
  const puntualidad = resumen.puntual;

  const clockHTML = getCurrentDateTime();
  const dateValue = selectedDate || todayISO();

  container.innerHTML = `
    <div class="db-section-header">
      <div>
        <h4><i class="bi bi-clock-fill"></i> Control de Asistencia</h4>
        <p class="db-section-desc">Registro diario de ingreso, salida y calculo de pagos</p>
      </div>
      <div class="db-card db-attendance-date-picker" style="padding: 0.55rem 0.8rem; display: flex; align-items: center; gap: 0.6rem">
        <i class="bi bi-calendar-event text-primary"></i>
        <label for="attendanceDate" class="visually-hidden">Fecha de asistencia</label>
        <input type="date" id="attendanceDate" class="db-date-input" value="${dateValue}" max="${todayISO()}" aria-label="Seleccionar fecha de asistencia">
        <span class="db-current-time" title="Hora actual">${clockHTML.split(', ').pop()}</span>
      </div>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-6 col-lg-3">
        <div class="db-stat-card" style="padding: 1rem 1.15rem">
          <div class="db-stat-icon info" style="width: 40px; height: 40px; font-size: 1.1rem"><i class="bi bi-people"></i></div>
          <div><div class="db-stat-value" style="font-size: 1.3rem" id="statActivos">${totalActivos}</div><div class="db-stat-label">Activos</div></div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="db-stat-card" style="padding: 1rem 1.15rem">
          <div class="db-stat-icon success" style="width: 40px; height: 40px; font-size: 1.1rem"><i class="bi bi-check2-circle"></i></div>
          <div><div class="db-stat-value" style="font-size: 1.3rem" id="statPresentes">${presentes}</div><div class="db-stat-label">Presentes</div></div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="db-stat-card" style="padding: 1rem 1.15rem">
          <div class="db-stat-icon danger" style="width: 40px; height: 40px; font-size: 1.1rem"><i class="bi bi-person-x"></i></div>
          <div><div class="db-stat-value" style="font-size: 1.3rem" id="statFaltantes">${faltantes}</div><div class="db-stat-label">Faltantes</div></div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="db-stat-card" style="padding: 1rem 1.15rem">
          <div class="db-stat-icon accent" style="width: 40px; height: 40px; font-size: 1.1rem"><i class="bi bi-stopwatch"></i></div>
          <div><div class="db-stat-value" style="font-size: 1.3rem" id="statPuntualidad">${puntualidad}%</div><div class="db-stat-label">Puntualidad</div></div>
        </div>
      </div>
    </div>

    <div class="db-tabs">
      <button class="db-tab active" data-tab="registro">
        <i class="bi bi-clipboard-check me-1"></i> Registro Diario
      </button>
      <button class="db-tab" data-tab="pagos">
        <i class="bi bi-cash-coin me-1"></i> Calculo de Pagos
      </button>
    </div>

    <!-- Tab: Registro Diario -->
    <div class="db-tab-content active" id="tabRegistro">
      <div class="db-card">
        <div class="db-card-header">
          <h5><i class="bi bi-clipboard-check text-primary me-2"></i>Marcar Asistencia Rapida</h5>
          <div class="db-search-wrapper">
            <i class="bi bi-search"></i>
            <input type="text" class="db-search-input" id="searchAsistencia" placeholder="Buscar operario...">
          </div>
        </div>
        <div class="db-card-body">
          <div id="listaAsistencia"></div>
        </div>
      </div>
    </div>

    <!-- Tab: Calculo de Pagos -->
    <div class="db-tab-content" id="tabPagos">
      <div class="db-card">
        <div class="db-card-header">
          <h5><i class="bi bi-cash-coin text-success me-2"></i>Pagos Estimados del Periodo</h5>
          <button class="btn-db-accent" id="btnExportPagos">
            <i class="bi bi-download me-1"></i> Exportar Pagos
          </button>
        </div>
        <div class="db-card-body" style="padding: 0">
          <div class="table-responsive">
            <table class="table db-table mb-0">
              <thead>
                <tr>
                  <th>Trabajador</th>
                  <th>Cargo</th>
                  <th>Salario Base</th>
                  <th>Tarifa/Hora</th>
                  <th>Horas Acumuladas</th>
                  <th>Dias</th>
                  <th class="text-end">Pago Estimado</th>
                </tr>
              </thead>
              <tbody id="tbodyPagos"></tbody>
              <tfoot id="tfootPagos"></tfoot>
            </table>
          </div>
          <div id="pagosEmpty" class="db-empty d-none">
            <i class="bi bi-cash-coin"></i>
            <p>No hay registros de horas trabajadas</p>
          </div>
        </div>
      </div>

      <div class="row g-3 mt-1">
        <div class="col-12 col-md-4">
          <div class="db-stat-card" style="padding: 1rem 1.15rem">
            <div class="db-stat-icon info" style="width: 38px; height: 38px; font-size: 1.05rem"><i class="bi bi-people"></i></div>
            <div><div class="db-stat-value" style="font-size: 1.2rem" id="pagoTotalTrabajadores">0</div><div class="db-stat-label">Trabajadores</div></div>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="db-stat-card" style="padding: 1rem 1.15rem">
            <div class="db-stat-icon accent" style="width: 38px; height: 38px; font-size: 1.05rem"><i class="bi bi-clock-history"></i></div>
            <div><div class="db-stat-value" style="font-size: 1.2rem" id="pagoTotalHoras">0h 00m</div><div class="db-stat-label">Total Horas</div></div>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="db-stat-card" style="padding: 1rem 1.15rem">
            <div class="db-stat-icon success" style="width: 38px; height: 38px; font-size: 1.05rem"><i class="bi bi-cash-stack"></i></div>
            <div><div class="db-stat-value" style="font-size: 1.2rem" id="pagoTotalMonto">S/ 0.00</div><div class="db-stat-label">Total Pago Estimado</div></div>
          </div>
        </div>
      </div>

      <div class="db-card mt-3">
        <div class="db-card-body" style="padding: 0.85rem 1.25rem">
          <div class="d-flex align-items-start gap-2">
            <i class="bi bi-info-circle text-primary mt-1"></i>
            <div style="font-size: 0.85rem; color: var(--db-gray); line-height: 1.55">
              El pago estimado se calcula multiplicando las horas acumuladas (segun marcaciones de entrada y salida) por la tarifa por hora del trabajador.
              La tarifa por hora se obtiene dividiendo el salario base entre 240 horas mensuales.
              Los valores son referenciales y no constituyen una planilla oficial.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderListaAsistencia(containerId, trabajadores, registrosMap) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  if (!trabajadores.length) {
    wrap.innerHTML = '<div class="db-empty"><i class="bi bi-search"></i><p>No se encontraron operarios</p></div>';
    return;
  }

  wrap.innerHTML = trabajadores.map((t) => {
    const color = generateAvatarColor(t.nombres);
    const initials = getInitials(t.nombres, t.apellidos);
    const reg = registrosMap.get(t.id);
    const tieneEntrada = reg && reg.horaEntrada;
    const tieneSalida = reg && reg.horaSalida;

    return `
      <div class="db-attendance-card mb-2" data-id="${t.id}">
        <div class="db-avatar" style="background: ${color}">${initials}</div>
        <div class="db-attendance-info">
          <div class="db-attendance-name">${t.nombres} ${t.apellidos}</div>
          <div class="db-attendance-meta">${t.cargo} · DNI ${t.dni}</div>
        </div>
        <div class="db-attendance-actions">
          ${tieneEntrada
            ? `<span class="db-time-badge bg-success bg-opacity-10 text-success"><i class="bi bi-box-arrow-in-right"></i> ${formatHora(reg.horaEntrada)}</span>
               <button class="db-action-btn db-attendance-action db-action-edit btnEditarHora" data-id="${reg.id}" data-campo="horaEntrada" data-hora="${reg.horaEntrada}" title="Editar hora de entrada"><i class="bi bi-pencil-square"></i><span>Editar</span></button>
               <button class="db-action-btn db-attendance-action db-action-delete btnDeshacer" data-id="${reg.id}" data-campo="horaEntrada" title="Deshacer entrada"><i class="bi bi-arrow-counterclockwise"></i><span>Deshacer</span></button>`
            : `<button class="btn btn-sm btn-success btnEntrada" data-id="${t.id}"><i class="bi bi-box-arrow-in-right"></i> Entrada</button>`
          }
          ${tieneSalida
            ? `<span class="db-time-badge bg-primary bg-opacity-10 text-primary"><i class="bi bi-box-arrow-out-right"></i> ${formatHora(reg.horaSalida)}</span>
               <button class="db-action-btn db-attendance-action db-action-edit btnEditarHora" data-id="${reg.id}" data-campo="horaSalida" data-hora="${reg.horaSalida}" title="Editar hora de salida"><i class="bi bi-pencil-square"></i><span>Editar</span></button>
               <button class="db-action-btn db-attendance-action db-action-delete btnDeshacer" data-id="${reg.id}" data-campo="horaSalida" title="Deshacer salida"><i class="bi bi-arrow-counterclockwise"></i><span>Deshacer</span></button>`
            : `<button class="btn btn-sm btn-outline-primary btnSalida" data-id="${t.id}" ${!tieneEntrada ? 'disabled' : ''}><i class="bi bi-box-arrow-out-right"></i> Salida</button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

export function renderEditarHoraModal(registroId, campo, horaActual, trabajadorNombre) {
  const campoLabel = campo === 'horaEntrada' ? 'Entrada' : 'Salida';
  return `
    <div class="modal fade" id="editarHoraModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-pencil-square text-warning me-2"></i>Editar Hora de ${campoLabel}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            <p style="font-size: 0.88rem; color: var(--db-gray)">Trabajador: <strong>${trabajadorNombre}</strong></p>
            <label class="db-form-label" for="nuevaHora">Nueva hora de ${campoLabel.toLowerCase()}</label>
            <input type="time" class="form-control db-form-control" id="nuevaHora" value="${horaActual}">
            <div class="invalid-feedback" id="nuevaHoraError">Ingrese una hora valida</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-db-outline" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn-db-primary" id="btnConfirmarEdicion">
              <i class="bi bi-check-lg me-1"></i> Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderTablaPagos(tbody, tfoot, emptyEl, data) {
  const { pagos, totales } = data;

  if (!pagos.length || totales.totalHoras === 0) {
    tbody.innerHTML = '';
    tfoot.innerHTML = '';
    emptyEl.classList.remove('d-none');
    document.getElementById('pagoTotalTrabajadores').textContent = '0';
    document.getElementById('pagoTotalHoras').textContent = '0h 00m';
    document.getElementById('pagoTotalMonto').textContent = 'S/ 0.00';
    return;
  }
  emptyEl.classList.add('d-none');

  tbody.innerHTML = pagos.map((p) => {
    const t = p.trabajador;
    const color = generateAvatarColor(t.nombres);
    const initials = getInitials(t.nombres, t.apellidos);
    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="db-avatar" style="background: ${color}; width: 32px; height: 32px; font-size: 0.7rem">${initials}</div>
            <div>
              <div style="font-weight: 600; font-size: 0.9rem">${t.nombres} ${t.apellidos}</div>
              <div style="font-size: 0.8rem; color: var(--db-gray)">${t.dni}</div>
            </div>
          </div>
        </td>
        <td style="font-size: 0.88rem">${p.cargo}</td>
        <td style="font-size: 0.88rem; font-weight: 600">${formatMoneda(p.salarioBase)}</td>
        <td style="font-size: 0.88rem; color: var(--db-gray)">${formatMoneda(p.tarifaHora)}</td>
        <td style="font-size: 0.88rem; font-weight: 600; color: var(--db-primary)">${formatHoras(p.horasAcumuladas)}</td>
        <td style="font-size: 0.88rem">${p.diasRegistrados}</td>
        <td class="text-end" style="font-size: 0.92rem; font-weight: 700; color: var(--db-success)">${formatMoneda(p.pagoEstimado)}</td>
      </tr>
    `;
  }).join('');

  tfoot.innerHTML = `
    <tr style="border-top: 2px solid var(--db-border); background: var(--db-light)">
      <td colspan="4" style="font-size: 0.88rem; font-weight: 700; color: var(--db-dark)">TOTALES</td>
      <td style="font-size: 0.88rem; font-weight: 700; color: var(--db-primary)">${formatHoras(totales.totalHoras)}</td>
      <td style="font-size: 0.88rem; font-weight: 600">${pagos.reduce((acc, p) => acc + p.diasRegistrados, 0)}</td>
      <td class="text-end" style="font-size: 0.95rem; font-weight: 800; color: var(--db-success)">${formatMoneda(totales.totalPago)}</td>
    </tr>
  `;

  document.getElementById('pagoTotalTrabajadores').textContent = totales.cantidadTrabajadores;
  document.getElementById('pagoTotalHoras').textContent = formatHoras(totales.totalHoras);
  document.getElementById('pagoTotalMonto').textContent = formatMoneda(totales.totalPago);
}
