import { renderLoginView } from '../views/loginView.js';
import { authService } from '../services/authService.js';
import { store } from '../utils/Store.js';
import { navigate } from '../utils/router.js';
import { toast } from '../utils/Toast.js';

export async function loginController(container) {
  renderLoginView(container);

  const form = document.getElementById('loginForm');
  const userInput = document.getElementById('loginUser');
  const passInput = document.getElementById('loginPassword');
  const userError = document.getElementById('loginUserError');
  const passError = document.getElementById('loginPasswordError');
  const generalError = document.getElementById('loginGeneralError');
  const submitBtn = document.getElementById('loginSubmit');

  function clearErrors() {
    userInput.classList.remove('is-invalid');
    passInput.classList.remove('is-invalid');
    userError.textContent = '';
    passError.textContent = '';
    generalError.classList.add('d-none');
  }

  function showFieldError(input, errorEl, msg) {
    input.classList.add('is-invalid');
    errorEl.textContent = msg;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const user = userInput.value.trim();
    const pass = passInput.value.trim();

    let hasError = false;
    if (!user) {
      showFieldError(userInput, userError, 'Ingrese su usuario');
      hasError = true;
    }
    if (!pass) {
      showFieldError(passInput, passError, 'Ingrese su contraseña');
      hasError = true;
    }
    if (hasError) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Verificando...';

    try {
      const result = await authService.login(user, pass);
      store.login(result);
      toast(`Bienvenido, ${result.name}`, 'success');
      navigate('/dashboard');
    } catch (err) {
      generalError.textContent = err.message;
      generalError.classList.remove('d-none');
      passInput.value = '';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Iniciar Sesión';
    }
  });

  userInput.addEventListener('input', clearErrors);
  passInput.addEventListener('input', clearErrors);
}
