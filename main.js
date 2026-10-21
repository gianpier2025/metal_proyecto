import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './src/styles/theme.css';

import { renderLayout, getLayout } from './src/layout.js';
import { registerRoute, initRouter, navigate } from './src/utils/router.js';
import { store } from './src/utils/Store.js';

import { loginController } from './src/controllers/loginController.js';
import { dashboardController } from './src/controllers/dashboardController.js';
import { trabajadoresController } from './src/controllers/trabajadoresController.js';
import { documentosController } from './src/controllers/documentosController.js';
import { asistenciaController } from './src/controllers/asistenciaController.js';

const NOT_FOUND = (container) => {
  container.innerHTML = `
    <div class="db-empty" style="padding: 4rem">
      <i class="bi bi-exclamation-circle"></i>
      <h3>Página no encontrada</h3>
      <p>El módulo solicitado no existe.</p>
      <button class="btn-db-primary mt-2" onclick="window.location.hash='/dashboard'">Ir al Panel</button>
    </div>
  `;
};

function boot() {
  if (store.isAuthenticated()) {
    renderLayout();
  } else {
    document.getElementById('app').innerHTML = '<div id="dbContent" class="db-content" style="padding:0; opacity:1"></div>';
  }

  registerRoute('/login', loginController);
  registerRoute('/dashboard', dashboardController);
  registerRoute('/trabajadores', trabajadoresController);
  registerRoute('/documentos', documentosController);
  registerRoute('/asistencia', asistenciaController);
  registerRoute('/404', NOT_FOUND);

  let layout = null;

  if (store.isAuthenticated()) {
    layout = getLayout();
  } else {
    layout = {
      getContent: () => document.getElementById('dbContent'),
      setActiveNav() {},
      showChrome() {
        document.getElementById('app').innerHTML = '';
        renderLayout();
        const newLayout = getLayout();
        layout.getContent = newLayout.getContent;
        layout.setActiveNav = newLayout.setActiveNav;
        layout.showChrome = newLayout.showChrome;
        layout.hideChrome = newLayout.hideChrome;
      },
      hideChrome() {},
    };
  }

  initRouter(layout);
}

boot();
