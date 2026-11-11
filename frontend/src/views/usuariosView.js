const ROLE_NAMES = {
  admin: 'Administrador',
  rrhh: 'Recursos Humanos',
  supervisor: 'Supervisor',
  consulta: 'Consulta',
};

export function renderUsuariosView(container, users) {
  container.innerHTML = `
    <div class="db-section-header">
      <div>
        <h4><i class="bi bi-shield-lock-fill"></i> Usuarios y accesos</h4>
        <p class="db-section-desc">Administra los roles y el acceso al sistema</p>
      </div>
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <div class="db-search-wrapper">
          <i class="bi bi-search"></i>
          <input type="search" class="db-search-input" id="searchUsuarios" placeholder="Buscar por nombre o correo...">
        </div>
        <button type="button" class="btn-db-primary" id="btnInvitarUsuario"><i class="bi bi-envelope-plus me-1"></i> Invitar usuario</button>
      </div>
    </div>

    <div class="alert alert-info" role="note">
      <strong>Acceso seguro:</strong> invita a cada persona con su correo. Recibirá un enlace para crear su contraseña; las cuentas nuevas empiezan con rol Consulta y luego puedes asignarles permisos.
    </div>

    <div class="db-card">
      <div class="db-card-header">
        <h5><i class="bi bi-people text-primary me-2"></i>Cuentas registradas</h5>
      </div>
      <div class="db-card-body" style="padding: 0">
        <div class="table-responsive">
          <table class="table db-table mb-0">
            <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Creado</th><th class="text-end">Acción</th></tr></thead>
            <tbody id="tbodyUsuarios"></tbody>
          </table>
        </div>
        <div id="usuariosEmpty" class="db-empty d-none"><i class="bi bi-people"></i><p>No hay usuarios que coincidan</p></div>
      </div>
    </div>
    <div id="invitarUsuarioModalHost">
      <div class="modal fade" id="invitarUsuarioModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <form class="modal-content" id="formInvitarUsuario">
            <div class="modal-header"><h5 class="modal-title">Invitar usuario</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>
            <div class="modal-body">
              <p class="text-muted small">Enviaremos un enlace al correo para que la persona cree su propia contraseña.</p>
              <div class="mb-3"><label class="db-form-label" for="nuevoUsuarioNombre">Nombre</label><input class="form-control db-form-control" id="nuevoUsuarioNombre" maxlength="150" required></div>
              <div class="mb-3"><label class="db-form-label" for="nuevoUsuarioEmail">Correo electrónico</label><input type="email" class="form-control db-form-control" id="nuevoUsuarioEmail" maxlength="254" required></div>
              <div class="small text-muted">Rol inicial: Consulta. Puedes cambiarlo después de aceptar la invitación.</div>
            </div>
            <div class="modal-footer"><button type="button" class="btn-db-outline" data-bs-dismiss="modal">Cancelar</button><button type="submit" class="btn-db-primary" id="enviarInvitacion"><i class="bi bi-send me-1"></i> Enviar invitación</button></div>
          </form>
        </div>
      </div>
    </div>
    <div id="usuarioModalHost"></div>
  `;
  renderUsuariosTable(users);
}

export function renderUsuariosTable(users, rows = users) {
  const tbody = document.getElementById('tbodyUsuarios');
  const empty = document.getElementById('usuariosEmpty');
  if (!tbody || !empty) return;
  if (!rows.length) {
    tbody.innerHTML = '';
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');
  tbody.innerHTML = rows.map((user) => `
    <tr>
      <td><div class="fw-semibold">${escapeHtml(user.nombre)}</div><div class="text-muted small">${escapeHtml(user.email || 'Sin correo')}</div></td>
      <td>${ROLE_NAMES[user.rol] || escapeHtml(user.rol)}</td>
      <td><span class="db-badge bg-${user.activo ? 'success' : 'secondary'} bg-opacity-10 text-${user.activo ? 'success' : 'secondary'}">${user.activo ? 'Activo' : 'Desactivado'}</span></td>
      <td>${user.created_at ? new Date(user.created_at).toLocaleDateString('es-CO') : '—'}</td>
      <td class="text-end"><button class="db-action-btn db-action-edit btnEditarUsuario" data-id="${escapeHtml(user.id)}"><i class="bi bi-pencil-square"></i><span>Editar acceso</span></button></td>
    </tr>
  `).join('');
}

export function renderEditarUsuarioModal(user) {
  const roleOptions = Object.entries(ROLE_NAMES).map(([value, label]) =>
    `<option value="${value}" ${user.rol === value ? 'selected' : ''}>${label}</option>`
  ).join('');
  return `
    <div class="modal fade" id="editarUsuarioModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title">Editar acceso</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>
          <div class="modal-body">
            <div class="mb-3"><label class="db-form-label">Cuenta</label><div class="fw-semibold">${escapeHtml(user.nombre)}</div><div class="text-muted small">${escapeHtml(user.email || '')}</div></div>
            <div class="mb-3"><label class="db-form-label" for="usuarioNombre">Nombre</label><input class="form-control db-form-control" id="usuarioNombre" value="${escapeHtml(user.nombre)}" required></div>
            <div class="mb-3"><label class="db-form-label" for="usuarioRol">Rol</label><select class="form-select db-form-control" id="usuarioRol">${roleOptions}</select></div>
            <div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" id="usuarioActivo" ${user.activo ? 'checked' : ''}><label class="form-check-label" for="usuarioActivo">Cuenta activa</label></div>
          </div>
          <div class="modal-footer"><button class="btn-db-outline" data-bs-dismiss="modal">Cancelar</button><button class="btn-db-primary" id="guardarUsuario">Guardar</button></div>
        </div>
      </div>
    </div>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}
