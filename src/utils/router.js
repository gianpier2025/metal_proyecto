import { store } from './Store.js';

const routes = {};
let currentLayout = null;

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
  const path = getRoute();

  if (!store.isAuthenticated() && path !== '/login') {
    navigate('/login');
    return;
  }
  if (store.isAuthenticated() && path === '/login') {
    navigate('/dashboard');
    return;
  }

  const handler = routes[path] || routes['/404'];
  const container = currentLayout.getContent();

  container.style.opacity = '0';
  await new Promise((r) => setTimeout(r, 80));

  if (path !== '/login') {
    currentLayout.setActiveNav(path);
    currentLayout.showChrome();
  } else {
    currentLayout.hideChrome();
  }

  try {
    await handler(container);
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger m-4">Error al cargar el módulo: ${err.message}</div>`;
  }

  container.style.opacity = '1';
}
