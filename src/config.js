export const CONFIG = {
  appName: 'D&B Electro Metal Mecánica',
  shortName: 'D&B',
  module: 'Gestión de Personal',
  apiBaseUrl: '/api',
  currency: 'PEN',
  companyColors: {
    primary: '#0d4f8b',
    accent: '#e8930c',
    success: '#1a8754',
    warning: '#e0a800',
    danger: '#c0392b',
    dark: '#1b2a3a',
    light: '#f4f6f9',
  },
};

export const CARGOS = [
  'Operario de Taller',
  'Soldador',
  'Tornero',
  'Fresador',
  'Electricista Industrial',
  'Montador',
  'Ayudante',
  'Supervisor de Producción',
  'Jefe de Taller',
  'Administrativo',
];

export const ESTADOS_TRABAJADOR = {
  ACTIVO: 'Activo',
  LICENCIA: 'En Licencia',
  INACTIVO: 'Inactivo',
};

export const ESTADOS_DOCUMENTO = {
  AL_DIA: { label: 'Al día', variant: 'success', icon: 'check-circle' },
  POR_VENCER: { label: 'Por vencer', variant: 'warning', icon: 'exclamation-triangle' },
  VENCIDO: { label: 'Vencido', variant: 'danger', icon: 'x-circle' },
  FALTANTE: { label: 'Faltante', variant: 'secondary', icon: 'file-excel' },
};

export const ESTADOS_CONTRATO = {
  AL_DIA: { label: 'Vigente', variant: 'success', icon: 'check-circle' },
  POR_VENCER: { label: 'Por vencer', variant: 'warning', icon: 'exclamation-triangle' },
  VENCIDO: { label: 'Vencido', variant: 'danger', icon: 'x-circle' },
  SIN_PDF: { label: 'Sin PDF', variant: 'secondary', icon: 'file-earmark-excel' },
};
