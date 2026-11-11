import { CONFIG } from './config.js';
import { store } from './utils/Store.js';
import { navigate } from './utils/router.js';
import { toast } from './utils/Toast.js';
import { canAccessRoute } from './utils/accessControl.js';
import { authService } from './services/authService.js';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Panel Principal', icon: 'speedometer2' },
  { path: '/trabajadores', label: 'Personal', icon: 'people-fill' },
  { path: '/documentos', label: 'Contratos', icon: 'file-earmark-pdf-fill' },
  { path: '/asistencia', label: 'Asistencia', icon: 'clock-fill' },
  { path: '/usuarios', label: 'Usuarios', icon: 'shield-lock-fill' },
];

export function renderLayout() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="db-sidebar" id="dbSidebar">
      <div class="db-sidebar-header">
        <div class="db-sidebar-logo">D&B</div>
        <div>
          <p class="db-sidebar-title">${CONFIG.appName}</p>
          <p class="db-sidebar-subtitle">${CONFIG.module}</p>
        </div>
      </div>
      <nav class="db-sidebar-nav" id="dbNav"></nav>
      <div class="db-sidebar-footer">
        <span id="dbClockMini" style="font-size: 0.68rem"></span>
      </div>
    </div>

    <div class="db-backdrop" id="dbBackdrop"></div>

    <div class="db-main" id="dbMain">
      <header class="db-topbar">
        <button class="db-topbar-toggle" id="dbToggleSidebar"><i class="bi bi-list"></i></button>
        <h2 class="db-topbar-title" id="dbTopbarTitle">Panel Principal</h2>
        <div class="db-topbar-clock" id="dbClock"><i class="bi bi-clock"></i> <span></span></div>
        <div class="db-topbar-user">
          <div class="db-topbar-user-avatar" id="dbUserAvatar">A</div>
          <div>
            <div class="db-topbar-user-name" id="dbUserName">Administrador</div>
            <div class="db-topbar-user-role">Administrador</div>
          </div>
          <button class="btn btn-sm btn-link text-danger p-0 ms-1" id="dbLogoutBtn" title="Cerrar sesión">
            <i class="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </header>
      <main class="db-content" id="dbContent"></main>
    </div>
  `;

  renderNav();
  bindLayoutEvents();
  startClock();
  setUser();
}

function renderNav() {
  const nav = document.getElementById('dbNav');
  const role = store.get().currentUser?.role;
  nav.innerHTML = NAV_ITEMS.filter((item) => canAccessRoute(role, item.path)).map((item) => `
    <a class="db-nav-item" data-path="${item.path}">
      <i class="bi bi-${item.icon}"></i>
      <span>${item.label}</span>
    </a>
  `).join('');

  nav.querySelectorAll('.db-nav-item').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.path);
      closeSidebarMobile();
    });
  });
}

function bindLayoutEvents() {
  const toggle = document.getElementById('dbToggleSidebar');
  const sidebar = document.getElementById('dbSidebar');
  const backdrop = document.getElementById('dbBackdrop');

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('show');
    backdrop.classList.toggle('show');
  });

  backdrop.addEventListener('click', closeSidebarMobile);

  document.getElementById('dbLogoutBtn').addEventListener('click', async () => {
    const logoutButton = document.getElementById('dbLogoutBtn');
    logoutButton.disabled = true;
    if (clockIntervalId) {
      clearInterval(clockIntervalId);
      clockIntervalId = null;
    }
    try {
      await authService.logout();
      store.logout();
      toast('Sesión cerrada', 'primary');
      navigate('/login');
    } catch (error) {
      toast(error.message || 'No se pudo cerrar la sesión', 'danger');
      logoutButton.disabled = false;
    }
  });
}

function closeSidebarMobile() {
  document.getElementById('dbSidebar').classList.remove('show');
  document.getElementById('dbBackdrop').classList.remove('show');
}

let clockIntervalId = null;

function startClock() {
  const clockSpan = document.querySelector('#dbClock span');
  const clockMini = document.getElementById('dbClockMini');

  if (clockIntervalId) {
    clearInterval(clockIntervalId);
    clockIntervalId = null;
  }

  function update() {
    const now = new Date();
    const time = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' });
    if (clockSpan) clockSpan.textContent = `${date}, ${time}`;
    if (clockMini) clockMini.textContent = `${date} · ${time}`;
  }
  update();
  clockIntervalId = setInterval(update, 1000);
}

function setUser() {
  const user = store.get().currentUser;
  if (user) {
    document.getElementById('dbUserName').textContent = user.name || 'Administrador';
    document.getElementById('dbUserAvatar').textContent = (user.name || 'A')[0].toUpperCase();
    document.querySelector('.db-topbar-user-role').textContent = user.roleLabel || user.role || '';
  }
}

export function getLayout() {
  return {
    getContent: () => document.getElementById('dbContent'),
    setActiveNav(path) {
      document.querySelectorAll('.db-nav-item').forEach((link) => {
        link.classList.toggle('active', link.dataset.path === path);
      });
      const item = NAV_ITEMS.find((i) => i.path === path);
      const titleEl = document.getElementById('dbTopbarTitle');
      if (item && titleEl) titleEl.textContent = item.label;
    },
    showChrome() {
      const sidebar = document.getElementById('dbSidebar');
      const main = document.getElementById('dbMain');
      const topbar = document.querySelector('.db-topbar');
      if (sidebar) sidebar.style.display = '';
      if (main) main.style.display = '';
      if (topbar) topbar.style.display = '';
    },
    hideChrome() {
      const sidebar = document.getElementById('dbSidebar');
      const main = document.getElementById('dbMain');
      const topbar = document.querySelector('.db-topbar');
      if (sidebar) sidebar.style.display = 'none';
      if (main) main.style.marginLeft = '0';
    },
  };
}
