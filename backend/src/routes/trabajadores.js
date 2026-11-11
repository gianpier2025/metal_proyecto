import { Router } from 'express';
import { withUserTransaction } from '../config/db.js';
import { HttpError, asyncHandler } from '../middleware/errors.js';
import { requireRole } from '../middleware/auth.js';
import { requireUuid, requireDate, requireMoney, requireNonEmptyString, toWorker } from '../utils.js';

const router = Router();
const columns = `id, dni, nombres, apellidos, cargo, estado, telefono, email,
  fecha_ingreso, direccion, salario_base, tarifa_por_hora, created_at, updated_at`;
const states = new Set(['Activo', 'En Licencia', 'Inactivo']);

function validateWorker(body, partial = false) {
  const values = {};
  if (!partial || body.dni !== undefined) {
    if (typeof body.dni !== 'string' || !/^\d{8}$/.test(body.dni.trim())) throw new HttpError(400, 'El DNI debe tener 8 dígitos.');
    values.dni = body.dni.trim();
  }
  for (const field of ['nombres', 'apellidos', 'cargo']) {
    if (!partial || body[field] !== undefined) values[field] = requireNonEmptyString(body[field], field, 120);
  }
  if (!partial || body.estado !== undefined) {
    const state = body.estado || 'Activo';
    if (!states.has(state)) throw new HttpError(400, 'El estado de trabajador no es válido.');
    values.estado = state;
  }
  for (const [input, column] of [['fechaIngreso', 'fecha_ingreso']]) {
    if (!partial || body[input] !== undefined) values[column] = requireDate(body[input], 'Fecha de ingreso');
  }
  for (const [input, column] of [['salarioBase', 'salario_base'], ['tarifaPorHora', 'tarifa_por_hora']]) {
    if (!partial || body[input] !== undefined) values[column] = requireMoney(body[input], input);
  }
  for (const [input, column] of [['telefono', 'telefono'], ['email', 'email'], ['direccion', 'direccion']]) {
    if (body[input] !== undefined) values[column] = body[input] ? requireNonEmptyString(body[input], input, 250) : null;
  }
  return values;
}

router.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const rows = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query(
      `select ${columns} from public.trabajadores
       where $1 = '' or nombres ilike $2 or apellidos ilike $2 or (nombres || ' ' || apellidos) ilike $2 or dni ilike $2 or cargo ilike $2
       order by apellidos, nombres`,
      [q, `%${q}%`]
    );
    return result.rows;
  });
  res.json(rows.map(toWorker));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id, 'ID de trabajador');
  const row = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query(`select ${columns} from public.trabajadores where id = $1`, [id]);
    return result.rows[0];
  });
  if (!row) throw new HttpError(404, 'No se encontró el trabajador.');
  res.json(toWorker(row));
}));

router.post('/', requireRole('admin', 'rrhh'), asyncHandler(async (req, res) => {
  const values = validateWorker(req.body);
  const row = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query(
      `insert into public.trabajadores
       (dni, nombres, apellidos, cargo, estado, telefono, email, fecha_ingreso, direccion, salario_base, tarifa_por_hora)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning ${columns}`,
      [values.dni, values.nombres, values.apellidos, values.cargo, values.estado, values.telefono ?? null,
        values.email ?? null, values.fecha_ingreso, values.direccion ?? null, values.salario_base, values.tarifa_por_hora]
    );
    return result.rows[0];
  });
  res.status(201).json(toWorker(row));
}));

router.patch('/:id', requireRole('admin', 'rrhh'), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id, 'ID de trabajador');
  const values = validateWorker(req.body, true);
  const entries = Object.entries(values);
  if (!entries.length) throw new HttpError(400, 'Envía al menos un campo para actualizar.');
  const row = await withUserTransaction(req.user.id, async (db) => {
    const set = entries.map(([column], index) => `${column} = $${index + 1}`).join(', ');
    const result = await db.query(`update public.trabajadores set ${set} where id = $${entries.length + 1} returning ${columns}`,
      [...entries.map(([, value]) => value), id]);
    return result.rows[0];
  });
  if (!row) throw new HttpError(404, 'No se encontró el trabajador.');
  res.json(toWorker(row));
}));

router.delete('/:id', requireRole('admin', 'rrhh'), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id, 'ID de trabajador');
  const result = await withUserTransaction(req.user.id, (db) => db.query(
    `update public.trabajadores set estado = 'Inactivo' where id = $1 returning id`, [id]
  ));
  if (!result.rows[0]) throw new HttpError(404, 'No se encontró el trabajador.');
  res.json({ success: true, id });
}));

export default router;
