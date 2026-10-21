export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

export function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

export function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

export function formatFecha(fechaISO) {
  if (!fechaISO) return '—';
  const d = new Date(fechaISO + 'T00:00:00');
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatHora(hora24) {
  if (!hora24) return '—';
  const [h, m] = hora24.split(':');
  const hora = parseInt(h, 10);
  const ampm = hora >= 12 ? 'pm' : 'am';
  const h12 = hora % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().split('T')[0];
}

export function getCurrentTime() {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}

export function getCurrentDateTime() {
  return new Date().toLocaleString('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calcularDiasRestantes(fechaVencimiento) {
  if (!fechaVencimiento) return null;
  const hoy = new Date(todayISO() + 'T00:00:00');
  const venc = new Date(fechaVencimiento + 'T00:00:00');
  return Math.ceil((venc - hoy) / 86400000);
}

export function calcularEstadoDocumento(fechaVencimiento) {
  if (!fechaVencimiento) return 'FALTANTE';
  const dias = calcularDiasRestantes(fechaVencimiento);
  if (dias < 0) return 'VENCIDO';
  if (dias <= 30) return 'POR_VENCER';
  return 'AL_DIA';
}

export function getInitials(nombre, apellido) {
  return ((nombre?.[0] || '') + (apellido?.[0] || '')).toUpperCase();
}

export function generateAvatarColor(nombre) {
  const colors = [
    '#0d4f8b', '#e8930c', '#1a8754', '#8e44ad',
    '#c0392b', '#2980b9', '#d35400', '#16a085',
  ];
  let hash = 0;
  const str = nombre || 'D&B';
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// ── Payment calculations ──

export const HORAS_MENSUALES = 240;

export function calcularHorasRegistro(horaEntrada, horaSalida) {
  if (!horaEntrada || !horaSalida) return 0;
  const [eh, em] = horaEntrada.split(':').map(Number);
  const [sh, sm] = horaSalida.split(':').map(Number);
  const minutos = (sh * 60 + sm) - (eh * 60 + em);
  return minutos > 0 ? minutos / 60 : 0;
}

export function calcularHorasTrabajador(asistencia, trabajadorId) {
  return asistencia
    .filter((a) => a.trabajadorId === trabajadorId && a.horaEntrada && a.horaSalida)
    .reduce((acc, a) => acc + calcularHorasRegistro(a.horaEntrada, a.horaSalida), 0);
}

export function calcularTarifaHora(salarioBase, tarifaPorHora) {
  if (tarifaPorHora && tarifaPorHora > 0) return tarifaPorHora;
  if (!salarioBase || salarioBase <= 0) return 0;
  return salarioBase / HORAS_MENSUALES;
}

export function formatMoneda(monto) {
  return 'S/ ' + (monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatHoras(horas) {
  if (!horas) return '0h 00m';
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
}
