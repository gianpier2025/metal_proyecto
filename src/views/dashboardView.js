import { calcularDiasRestantes, formatFecha, getInitials, generateAvatarColor } from '../utils/helpers.js';

export function renderDashboardView(container, data) {
  const {
    totalTrabajadores,
    trabajadoresActivos,
    puntualidadHoy,
    presentesHoy,
    contratosVencidos,
    contratosPorVencer,
    contratosSinPdf,
    contratosVigentes,
    alertasContratos,
  } = data;

  const alertasHTML = alertasContratos.length
    ? alertasContratos.map((a) => {
        const variant = a.estadoKey === 'VENCIDO' ? 'danger' : 'warning';
        const icon = a.estadoKey === 'VENCIDO' ? 'x-circle' : 'exclamation-triangle';
        const t = a.trabajador;
        const nombre = t ? t.nombres + ' ' + t.apellidos : 'Desconocido';
        const color = t ? generateAvatarColor(t.nombres) : '#0d4f8b';
        const initials = t ? getInitials(t.nombres, t.apellidos) : '?';
        const dias = a.diasRestantes;
        let diasLabel = '';
        if (dias !== null) {
          if (dias < 0) diasLabel = Math.abs(dias) + ' dias vencido';
          else if (dias === 0) diasLabel = 'Vence hoy';
          else diasLabel = 'Vence en ' + dias + ' dias';
        }

        return `
          <div class="d-flex align-items-center gap-2 py-2 border-bottom" style="border-color: var(--db-light-2) !important">
            <div class="db-avatar" style="background: ${color}; width: 28px; height: 28px; font-size: 0.6rem">${initials}</div>
            <div class="flex-grow-1 min-w-0">
              <div style="font-size: 0.88rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${nombre}</div>
              <div style="font-size: 0.78rem; color: var(--db-gray)">${diasLabel} · ${formatFecha(a.fechaVencimiento)}</div>
            </div>
            <span class="db-badge bg-${variant} bg-opacity-10 text-${variant}" style="flex-shrink: 0">
              <i class="bi bi-${icon}"></i> ${a.estadoKey === 'VENCIDO' ? 'Vencido' : 'Por vencer'}
            </span>
          </div>
        `;
      }).join('')
    : '<div class="db-empty" style="padding: 1.5rem"><i class="bi bi-check-circle"></i><p>No hay alertas de contratos</p></div>';

  const totalAlertas = contratosVencidos + contratosPorVencer;

  container.innerHTML = `
    <div class="db-section-header">
      <div>
        <h4><i class="bi bi-speedometer2"></i> Panel Principal</h4>
        <p class="db-section-desc">Resumen general del personal y estado operativo</p>
      </div>
      <button class="btn-db-accent" id="btnExportReport">
        <i class="bi bi-download me-1"></i> Exportar Reporte
      </button>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="db-stat-card">
          <div class="db-stat-icon primary"><i class="bi bi-people-fill"></i></div>
          <div>
            <div class="db-stat-value">${trabajadoresActivos}</div>
            <div class="db-stat-label">Trabajadores Activos</div>
            <div style="font-size: 0.78rem; color: var(--db-gray); margin-top: 0.15rem">${totalTrabajadores} en total</div>
          </div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="db-stat-card">
          <div class="db-stat-icon success"><i class="bi bi-clock-history"></i></div>
          <div>
            <div class="db-stat-value">${puntualidadHoy}%</div>
            <div class="db-stat-label">Puntualidad de Hoy</div>
            <div style="font-size: 0.78rem; color: var(--db-gray); margin-top: 0.15rem">${presentesHoy} presentes</div>
          </div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="db-stat-card">
          <div class="db-stat-icon danger"><i class="bi bi-file-earmark-x-fill"></i></div>
          <div>
            <div class="db-stat-value">${contratosVencidos}</div>
            <div class="db-stat-label">Contratos Vencidos</div>
            <div style="font-size: 0.78rem; color: var(--db-gray); margin-top: 0.15rem">Requieren atencion</div>
          </div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="db-stat-card">
          <div class="db-stat-icon warning"><i class="bi bi-file-earmark-excel-fill"></i></div>
          <div>
            <div class="db-stat-value">${contratosPorVencer}</div>
            <div class="db-stat-label">Por Vencer (30 dias)</div>
            <div style="font-size: 0.78rem; color: var(--db-gray); margin-top: 0.15rem">Proximos a expirar</div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-12 col-lg-8">
        <div class="db-card mb-3">
          <div class="db-card-header">
            <h5><i class="bi bi-bar-chart-fill text-primary me-2"></i>Distribucion de Personal por Cargo</h5>
          </div>
          <div class="db-card-body">
            <div id="distChart" style="min-height: 200px"></div>
          </div>
        </div>

        <div class="db-card">
          <div class="db-card-header">
            <h5><i class="bi bi-file-earmark-pdf-fill text-danger me-2"></i>Estado de Contratos</h5>
          </div>
          <div class="db-card-body">
            <div class="row g-2 text-center">
              <div class="col-4">
                <div style="padding: 0.75rem; border-radius: 8px; background: rgba(26,135,84,0.08)">
                  <div style="font-size: 1.5rem; font-weight: 800; color: var(--db-success)">${contratosVigentes ?? 0}</div>
                  <div style="font-size: 0.8rem; color: var(--db-gray); font-weight: 500">Vigentes</div>
                </div>
              </div>
              <div class="col-4">
                <div style="padding: 0.75rem; border-radius: 8px; background: rgba(224,168,0,0.08)">
                  <div style="font-size: 1.5rem; font-weight: 800; color: var(--db-warning)">${contratosPorVencer}</div>
                  <div style="font-size: 0.8rem; color: var(--db-gray); font-weight: 500">Por vencer</div>
                </div>
              </div>
              <div class="col-4">
                <div style="padding: 0.75rem; border-radius: 8px; background: rgba(192,57,43,0.08)">
                  <div style="font-size: 1.5rem; font-weight: 800; color: var(--db-danger)">${contratosVencidos}</div>
                  <div style="font-size: 0.8rem; color: var(--db-gray); font-weight: 500">Vencidos</div>
                </div>
              </div>
            </div>
            ${contratosSinPdf > 0 ? `
              <div class="d-flex align-items-center gap-2 mt-2 p-2 rounded" style="background: var(--db-light)">
                <i class="bi bi-file-earmark-excel text-secondary"></i>
                <span style="font-size: 0.85rem; color: var(--db-gray)">${contratosSinPdf} contrato(s) sin PDF subido</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-4">
        <div class="db-card">
          <div class="db-card-header">
            <h5>
              <i class="bi bi-bell-fill text-warning me-2"></i>Alertas de Contratos
              ${totalAlertas > 0 ? `<span class="db-badge bg-danger bg-opacity-10 text-danger ms-1">${totalAlertas}</span>` : ''}
            </h5>
          </div>
          <div class="db-card-body" style="padding: 0.5rem 1.25rem">
            ${alertasHTML}
          </div>
        </div>
      </div>
    </div>
  `;
}
