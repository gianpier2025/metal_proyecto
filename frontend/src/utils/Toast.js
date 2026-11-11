import * as bootstrap from 'bootstrap';

let toastContainer = null;

function ensureContainer() {
  if (!toastContainer) {
    toastContainer = el('div', 'toast-container position-fixed top-0 end-0 p-3');
    toastContainer.style.zIndex = '1090';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

export function toast(message, variant = 'primary', delay = 3500) {
  const container = ensureContainer();
  const t = el('div', `toast align-items-center text-bg-${variant} border-0`);
  t.setAttribute('role', 'alert');
  t.setAttribute('aria-live', 'assertive');
  t.setAttribute('aria-atomic', 'true');

  const body = el('div', 'd-flex');
  const msg = el('div', 'toast-body', message);
  const btn = el('button', 'btn-close btn-close-white me-2 m-auto');
  btn.setAttribute('data-bs-dismiss', 'toast');
  btn.setAttribute('aria-label', 'Cerrar');
  body.appendChild(msg);
  body.appendChild(btn);
  t.appendChild(body);
  container.appendChild(t);

  const instance = new bootstrap.Toast(t, { delay });
  instance.show();
  t.addEventListener('hidden.bs.toast', () => t.remove());
}
