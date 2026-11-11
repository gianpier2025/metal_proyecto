const ACCESS = {
  admin: {
    routes: ['/dashboard', '/trabajadores', '/documentos', '/asistencia', '/usuarios'],
    manageWorkers: true,
    manageContracts: true,
    manageAttendance: true,
  },
  rrhh: {
    routes: ['/dashboard', '/trabajadores', '/documentos'],
    manageWorkers: true,
    manageContracts: true,
    manageAttendance: false,
  },
  supervisor: {
    routes: ['/dashboard', '/trabajadores', '/asistencia'],
    manageWorkers: false,
    manageContracts: false,
    manageAttendance: true,
  },
  consulta: {
    routes: ['/dashboard'],
    manageWorkers: false,
    manageContracts: false,
    manageAttendance: false,
  },
};

export function canAccessRoute(role, path) {
  return ACCESS[role]?.routes.includes(path) ?? false;
}

export function canManage(role, area) {
  const key = {
    trabajadores: 'manageWorkers',
    documentos: 'manageContracts',
    asistencia: 'manageAttendance',
  }[area];
  return Boolean(key && ACCESS[role]?.[key]);
}

export function isAdmin(role) {
  return role === 'admin';
}

export function routeForRole(role) {
  return ACCESS[role]?.routes[0] || '/login';
}
