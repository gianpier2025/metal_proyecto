import { renderDashboardView } from '../views/dashboardView.js';
import { reportesService } from '../services/reportesService.js';
import { toast } from '../utils/Toast.js';
import { escapeHTML } from '../utils/helpers.js';

export async function dashboardController(container) {
  const data = await reportesService.getDashboard();
  renderDashboardView(container, data);

  renderDistributionChart(container, data.trabajadoresPorCargo || []);

  const exportBtn = document.getElementById('btnExportReport');
  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    exportBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Generando...';
    try {
      const reporte = await reportesService.exportReporte();
      downloadCSV(reporte, 'reporte_personal_db.csv');
      toast('Reporte exportado correctamente', 'success');
    } catch (err) {
      toast(err.message || 'Error al exportar reporte', 'danger');
    } finally {
      exportBtn.disabled = false;
      exportBtn.innerHTML = '<i class="bi bi-download me-1"></i> Exportar Reporte';
    }
  });
}

function renderDistributionChart(container, distribution) {
  const chartDiv = container.querySelector('#distChart');
  if (!distribution.length) {
    chartDiv.innerHTML = '<div class="db-empty" style="padding: 1.5rem"><i class="bi bi-people"></i><p>No hay trabajadores registrados</p></div>';
    return;
  }
  const max = Math.max(...distribution.map((item) => item.cantidad));

  chartDiv.innerHTML = distribution.map(({ cargo, cantidad }) => {
    const pct = max > 0 ? (cantidad / max) * 100 : 0;
    return `
      <div class="mb-2">
        <div class="d-flex justify-content-between mb-1">
          <span style="font-size: 0.8rem; font-weight: 500">${escapeHTML(cargo)}</span>
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--db-primary)">${cantidad}</span>
        </div>
        <div style="height: 10px; background: var(--db-light); border-radius: 5px; overflow: hidden">
          <div style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, var(--db-primary), var(--db-primary-light)); border-radius: 5px; transition: width 0.6s ease"></div>
        </div>
      </div>
    `;
  }).join('');
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
