import { Router } from 'express';
import { withUserTransaction } from '../config/db.js';
import { HttpError, asyncHandler } from '../middleware/errors.js';
import { requireRole } from '../middleware/auth.js';
import { requireUuid, requireNonEmptyString } from '../utils.js';

const router = Router();
const roles = new Set(['admin', 'rrhh', 'supervisor', 'consulta']);

router.get('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await withUserTransaction(req.user.id, (db) => db.query(
    'select id, nombre, email, rol, activo, created_at from public.profiles order by created_at desc'
  ));
  res.json(result.rows);
}));

router.patch('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id, 'ID de usuario');
  const nombre = requireNonEmptyString(req.body.nombre, 'Nombre', 150);
  const rol = req.body.rol;
  const activo = req.body.activo;
  if (!roles.has(rol) || typeof activo !== 'boolean') throw new HttpError(400, 'Rol o estado de cuenta no válido.');
  if (id === req.user.id && (!activo || rol !== 'admin')) throw new HttpError(400, 'No puedes desactivar ni quitar el rol admin de tu propia cuenta.');

  const user = await withUserTransaction(req.user.id, async (db) => {
    const existing = await db.query('select id, rol, activo from public.profiles where id = $1 for update', [id]);
    const target = existing.rows[0];
    if (!target) return null;
    if (target.rol === 'admin' && target.activo && (rol !== 'admin' || !activo)) {
      const admins = await db.query("select count(*)::int as total from public.profiles where rol = 'admin' and activo = true");
      if (admins.rows[0].total <= 1) throw new HttpError(409, 'Debe quedar al menos un administrador activo.');
    }
    const result = await db.query(
      'update public.profiles set nombre = $1, rol = $2, activo = $3 where id = $4 returning id, nombre, email, rol, activo, created_at',
      [nombre, rol, activo, id]
    );
    return result.rows[0];
  });
  if (!user) throw new HttpError(404, 'No se encontró el usuario.');
  res.json(user);
}));

router.post('/invitar', requireRole('admin'), asyncHandler(async (req, res) => {
  const email = requireNonEmptyString(req.body.email, 'Correo', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'El correo no es válido.');
  const secret = process.env.SUPABASE_SECRET_KEY;
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  if (!secret || !url || /PLACEHOLDER|YOUR_|TU-PROJECT/.test(`${secret} ${url}`)) {
    throw new HttpError(503, 'Configura SUPABASE_SECRET_KEY solo en el entorno seguro del backend para invitar usuarios.');
  }
  const nombre = requireNonEmptyString(req.body.nombre, 'Nombre', 150);
  const redirectTo = process.env.AUTH_REDIRECT_URL;
  const response = await fetch(`${url}/auth/v1/invite${redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ''}`, {
    method: 'POST',
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, data: { nombre } }),
  });
  if (!response.ok) {
    if (response.status === 422 || response.status === 409) throw new HttpError(409, 'No se pudo invitar: el correo quizá ya tiene una cuenta.');
    throw new HttpError(502, 'Supabase Auth no pudo enviar la invitación.');
  }
  res.status(202).json({ success: true, email, rolInicial: 'consulta' });
}));

export default router;
