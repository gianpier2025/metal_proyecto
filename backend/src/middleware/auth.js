import { withUserTransaction } from '../config/db.js';
import { HttpError, asyncHandler } from './errors.js';

function authConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || /TU-PROJECT|YOUR_|PLACEHOLDER/.test(`${url} ${key}`)) {
    throw new HttpError(503, 'Falta configurar SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en el backend.');
  }
  return { url, key };
}

export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, 'Inicia sesión para continuar.');

  const { url, key } = authConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${match[1]}`,
    },
  });
  if (!response.ok) throw new HttpError(401, 'La sesión expiró o no es válida. Inicia sesión de nuevo.');

  const authUser = await response.json();
  if (!authUser?.id) throw new HttpError(401, 'La sesión no identifica a un usuario válido.');

  const result = await withUserTransaction(authUser.id, (db) => db.query(
    'select id, nombre, email, rol, activo from public.profiles where id = $1',
    [authUser.id]
  ));
  const profile = result.rows[0];
  if (!profile || !profile.activo) throw new HttpError(403, 'La cuenta no tiene un perfil activo.');

  req.user = {
    id: profile.id,
    email: profile.email || authUser.email || '',
    name: profile.nombre,
    role: profile.rol,
    active: profile.activo,
    accessToken: match[1],
  };
  next();
});

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'Tu rol no tiene permiso para acceder a este recurso.'));
    }
    next();
  };
}
