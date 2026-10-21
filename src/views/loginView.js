import { CONFIG } from '../config.js';

export function renderLoginView(container) {
  container.innerHTML = `
    <div class="db-login-wrapper">
      <div class="db-login-card">
        <div class="db-login-logo">D&B</div>
        <h1 class="db-login-title">D&B Electro Metal Mecánica</h1>
        <p class="db-login-subtitle">Sistema de Gestión de Personal</p>

        <form id="loginForm" novalidate>
          <div class="mb-3">
            <label class="db-form-label" for="loginUser">Usuario</label>
            <div class="input-group">
              <span class="input-group-text bg-transparent border-end-0" style="border-color: var(--db-border)">
                <i class="bi bi-person"></i>
              </span>
              <input type="text" class="form-control db-form-control border-start-0" id="loginUser"
                placeholder="admin" autocomplete="username" required>
            </div>
            <div class="invalid-feedback" id="loginUserError"></div>
          </div>

          <div class="mb-3">
            <label class="db-form-label" for="loginPassword">Contraseña</label>
            <div class="input-group">
              <span class="input-group-text bg-transparent border-end-0" style="border-color: var(--db-border)">
                <i class="bi bi-lock"></i>
              </span>
              <input type="password" class="form-control db-form-control border-start-0" id="loginPassword"
                placeholder="••••••••" autocomplete="current-password" required>
            </div>
            <div class="invalid-feedback" id="loginPasswordError"></div>
          </div>

          <div id="loginGeneralError" class="alert alert-danger d-none" style="font-size: 0.82rem; padding: 0.6rem 0.85rem"></div>

          <button type="submit" class="btn-db-primary w-100 mt-2" id="loginSubmit">
            <i class="bi bi-box-arrow-in-right me-1"></i> Iniciar Sesión
          </button>
        </form>

        <div class="text-center mt-4 pt-3" style="border-top: 1px solid var(--db-border)">
          <p style="font-size: 0.8rem; color: var(--db-gray); margin: 0">
            Credenciales demo: <strong>admin</strong> / <strong>admin123</strong>
          </p>
        </div>
      </div>
    </div>
  `;
}
