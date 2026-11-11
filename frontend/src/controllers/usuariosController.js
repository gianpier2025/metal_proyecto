import * as bootstrap from 'bootstrap';
import { renderUsuariosView, renderUsuariosTable, renderEditarUsuarioModal } from '../views/usuariosView.js';
import { usuariosService } from '../services/usuariosService.js';
import { toast } from '../utils/Toast.js';

export async function usuariosController(container) {
  const users = await usuariosService.getAll();
  renderUsuariosView(container, users);
  const search = document.getElementById('searchUsuarios');
  const inviteModal = new bootstrap.Modal(document.getElementById('invitarUsuarioModal'));
  document.getElementById('btnInvitarUsuario').addEventListener('click', () => inviteModal.show());
  document.getElementById('formInvitarUsuario').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = document.getElementById('enviarInvitacion');
    const nombre = document.getElementById('nuevoUsuarioNombre').value.trim();
    const email = document.getElementById('nuevoUsuarioEmail').value.trim();
    if (!form.reportValidity()) return;
    button.disabled = true;
    try {
      await usuariosService.invite({ nombre, email });
      form.reset();
      inviteModal.hide();
      toast(`Invitación enviada a ${email}`, 'success');
      try {
        const refreshed = await usuariosService.getAll();
        users.splice(0, users.length, ...refreshed);
        renderUsuariosTable(users, filterUsers(users, search.value));
        bindEditButtons(users);
      } catch {
        // La invitación ya se envió; la tabla se actualizará al recargar el módulo.
      }
    } catch (error) {
      toast(error.message || 'No se pudo enviar la invitación', 'danger');
    } finally {
      button.disabled = false;
    }
  });
  search.addEventListener('input', () => {
    const filtered = filterUsers(users, search.value);
    renderUsuariosTable(users, filtered);
    bindEditButtons(filtered);
  });
  bindEditButtons(users);

  function bindEditButtons(rows) {
    document.querySelectorAll('.btnEditarUsuario').forEach((button) => {
      button.addEventListener('click', () => {
        const user = rows.find((candidate) => candidate.id === button.dataset.id);
        if (user) openEditModal(user);
      });
    });
  }

  function openEditModal(user) {
    const host = document.getElementById('usuarioModalHost');
    host.innerHTML = renderEditarUsuarioModal(user);
    const modalEl = document.getElementById('editarUsuarioModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    modalEl.addEventListener('hidden.bs.modal', () => host.replaceChildren(), { once: true });
    document.getElementById('guardarUsuario').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      const nombre = document.getElementById('usuarioNombre').value.trim();
      if (!nombre) {
        document.getElementById('usuarioNombre').classList.add('is-invalid');
        return;
      }
      button.disabled = true;
      try {
        const updated = await usuariosService.update(user.id, {
          nombre,
          rol: document.getElementById('usuarioRol').value,
          activo: document.getElementById('usuarioActivo').checked,
        });
        const index = users.findIndex((candidate) => candidate.id === updated.id);
        users[index] = updated;
        renderUsuariosTable(users, users.filter((candidate) => `${candidate.nombre} ${candidate.email || ''}`.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())));
        bindEditButtons(users);
        toast('Permisos de usuario actualizados', 'success');
        modal.hide();
      } catch (error) {
        toast(error.message || 'No se pudieron actualizar los permisos', 'danger');
        button.disabled = false;
      }
    });
  }
}

function filterUsers(users, value) {
  const query = value.trim().toLocaleLowerCase();
  return users.filter((user) => `${user.nombre} ${user.email || ''}`.toLocaleLowerCase().includes(query));
}
