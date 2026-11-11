import { store } from './Store.js';
import { canAccessRoute, routeForRole } from './accessControl.js';
import { authService } from '../services/authService.js';

const routes = {};
let currentLayout = null;
let renderId = 0;

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function getRoute() {
  const hash = window.location.hash.slice(1) || '/dashboard';
  return hash;
}

export function navigate(path) {
  window.location.hash = path;
}

export function initRouter(layout) {
  currentLayout = layout;
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}

async function renderRoute() {
  if (!currentLayout) return;
  const currentRenderId = ++renderId;
  let path = getRoute();
  const isPasswordSetup = path === '/set-password';

  if (store.isAuthenticated() && path !== '/login') {
    try {
      const latestUser = await authService.getCurrentUser();
      if (currentRenderId !== renderId) return;
      if (!latestUser) {
        store.logout();
        navigate('/login');
        return;
      }
      store.login(latestUser);
    } catch {
      if (currentRenderId !== renderId) return;
      store.logout();
      navigate('/login');
      return;
    }
    path = getRoute();
  }

  if (!store.isAuthenticated() && path !== '/login') {
    navigate('/login');
    return;
  }
  if (store.isAuthenticated() && path === '/login') {
    navigate('/dashboard');
    return;
  }

  if (store.isAuthenticated() && path !== '/login' && !isPasswordSetup && !canAccessRoute(store.get().currentUser?.role, path)) {
    const fallback = routeForRole(store.get().currentUser?.role);
    if (path !== fallback) {
      navigate(fallback);
      return;
    }
  }

  const handler = routes[path] || routes['/404'];

  if (path !== '/login') {
    currentLayout.setActiveNav(path);
    currentLayout.showChrome();
  } else {
    currentLayout.hideChrome();
  }

  const container = currentLayout.getContent();
  container.innerHTML = '<div class="d-flex justify-content-center align-items-center py-5"><span class="spinner-border spinner-border-sm text-primary me-2" role="status"></span><span class="text-muted">Cargando...</span></div>';
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (currentRenderId !== renderId) return;

  try {
    if (store.isAuthenticated() && path !== '/login' && !isPasswordSetup && !canAccessRoute(store.get().currentUser?.role, path)) {
      container.innerHTML = '<div class="alert alert-warning m-4">No tienes permiso para acceder a este módulo.</div>';
    } else {
      await handler(container);
    }
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger m-4">Error al cargar el módulo: ${err.message}</div>`;
  }

}
