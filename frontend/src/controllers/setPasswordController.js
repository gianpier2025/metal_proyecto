import { authService } from '../services/authService.js';
import { navigate } from '../utils/router.js';
import { toast } from '../utils/Toast.js';

export async function setPasswordController(container) {
  container.innerHTML = `
    <div class="container py-5" style="max-width: 520px">
      <div class="db-card"><div class="db-card-body p-4">
        <h3 class="mb-2">Crea tu contraseña</h3>
        <p class="text-muted">Elige una contraseña para acceder a Metal Proyecto.</p>
        <form id="setPasswordForm">
          <div class="mb-3"><label class="db-form-label" for="newPassword">Nueva contraseña</label><input type="password" class="form-control db-form-control" id="newPassword" minlength="8" autocomplete="new-password" required><div class="form-text">Debe tener al menos 8 caracteres.</div></div>
          <div class="mb-3"><label class="db-form-label" for="confirmPassword">Confirma la contraseña</label><input type="password" class="form-control db-form-control" id="confirmPassword" minlength="8" autocomplete="new-password" required></div>
          <div class="alert alert-danger d-none" id="passwordError" role="alert"></div>
          <button class="btn-db-primary w-100" id="savePassword" type="submit">Guardar contraseña</button>
        </form>
      </div></div>
    </div>`;

  document.getElementById('setPasswordForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = document.getElementById('newPassword').value;
    const confirmation = document.getElementById('confirmPassword').value;
    const errorBox = document.getElementById('passwordError');
    const button = document.getElementById('savePassword');
    errorBox.classList.add('d-none');
    if (password.length < 8) errorBox.textContent = 'La contraseña debe tener al menos 8 caracteres.';
    else if (password !== confirmation) errorBox.textContent = 'Las contraseñas no coinciden.';
    else errorBox.textContent = '';
    if (errorBox.textContent) {
      errorBox.classList.remove('d-none');
      return;
    }
    button.disabled = true;
    try {
      await authService.setPassword(password);
      toast('Contraseña creada correctamente', 'success');
      window.history.replaceState({}, '', `${window.location.pathname}#/dashboard`);
      navigate('/dashboard');
    } catch (error) {
      errorBox.textContent = error.message || 'No se pudo guardar la contraseña.';
      errorBox.classList.remove('d-none');
      button.disabled = false;
    }
  });
}
