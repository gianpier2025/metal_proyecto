import { Router } from 'express';
import { withUserTransaction } from '../config/db.js';
import { HttpError, asyncHandler } from '../middleware/errors.js';
import { requireRole } from '../middleware/auth.js';
import { requireUuid, requireDate, toAttendance } from '../utils.js';

const router = Router();
const baseFields = `a.id, a.trabajador_id, a.fecha, a.hora_entrada, a.hora_salida,
  a.estado, a.observacion, a.created_at, a.updated_at`;
const returningFields = `id, trabajador_id, fecha, hora_entrada, hora_salida,
  estado, observacion, created_at, updated_at`;
const workerJoin = `left join public.trabajadores t on t.id = a.trabajador_id`;
const workerFields = `, t.dni as trabajador_dni, t.nombres as trabajador_nombres,
  t.apellidos as trabajador_apellidos, t.cargo as trabajador_cargo, t.estado as trabajador_estado`;

router.get('/', asyncHandler(async (req, res) => {
  const date = requireDate(String(req.query.fecha || new Date().toISOString().slice(0, 10)), 'Fecha');
  const rows = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query(
      `select ${baseFields}${workerFields} from public.asistencias a ${workerJoin} where a.fecha = $1 order by t.apellidos, t.nombres`, [date]
    );
    return result.rows;
  });
  res.json(rows.map(toAttendance));
}));

router.get('/resumen', asyncHandler(async (req, res) => {
  const date = requireDate(String(req.query.fecha || new Date().toISOString().slice(0, 10)), 'Fecha');
  const summary = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query(
      `select
         count(*) filter (where t.estado = 'Activo')::int as total_activos,
         count(a.id) filter (where t.estado = 'Activo')::int as presentes,
         count(a.id) filter (where t.estado = 'Activo' and a.hora_salida is not null)::int as con_salida,
         count(a.id) filter (where t.estado = 'Activo' and a.hora_entrada <= time '07:15')::int as puntuales
       from public.trabajadores t
       left join public.asistencias a on a.trabajador_id = t.id and a.fecha = $1`, [date]
    );
    return result.rows[0];
  });
  const present = Number(summary.presentes);
  const total = Number(summary.total_activos);
  res.json({
    totalActivos: total,
    presentes: present,
    conSalida: Number(summary.con_salida),
    puntual: present ? Math.round((Number(summary.puntuales) / present) * 100) : 0,
    faltantes: Math.max(0, total - present),
  });
}));

router.get('/historial', asyncHandler(async (req, res) => {
  const desde = req.query.desde ? requireDate(String(req.query.desde), 'Fecha desde') : null;
  const hasta = req.query.hasta ? requireDate(String(req.query.hasta), 'Fecha hasta') : null;
  const q = String(req.query.q || '').trim();
  const rows = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query(
      `select ${baseFields}${workerFields} from public.asistencias a ${workerJoin}
       where ($1::date is null or a.fecha >= $1)
         and ($2::date is null or a.fecha <= $2)
         and ($3 = '' or t.dni ilike $4 or (t.nombres || ' ' || t.apellidos) ilike $4)
       order by a.fecha desc, t.apellidos, t.nombres`,
      [desde, hasta, q, `%${q}%`]
    );
    return result.rows;
  });
  res.json(rows.map(toAttendance));
}));

router.post('/marcar', requireRole('admin', 'rrhh', 'supervisor'), asyncHandler(async (req, res) => {
  const trabajadorId = requireUuid(req.body.trabajadorId, 'ID de trabajador');
  const fecha = requireDate(req.body.fecha || new Date().toISOString().slice(0, 10), 'Fecha');
  const tipo = req.body.tipo;
  if (!['entrada', 'salida'].includes(tipo)) throw new HttpError(400, 'El tipo debe ser entrada o salida.');
  const field = tipo === 'entrada' ? 'hora_entrada' : 'hora_salida';
  const row = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query(
      `insert into public.asistencias (trabajador_id, fecha, ${field}, estado)
       values ($1, $2, (now() at time zone 'America/Lima')::time, 'presente')
       on conflict (trabajador_id, fecha) do update set ${field} = excluded.${field}, estado = 'presente'
       returning ${returningFields}`,
      [trabajadorId, fecha]
    );
    return result.rows[0];
  });
  res.status(201).json(toAttendance(row));
}));

router.patch('/:id/hora', requireRole('admin', 'rrhh', 'supervisor'), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id, 'ID de asistencia');
  const columnsByField = { horaEntrada: 'hora_entrada', horaSalida: 'hora_salida' };
  const column = columnsByField[req.body.campo];
  if (!column) throw new HttpError(400, 'El campo solo puede ser horaEntrada u horaSalida.');
  const time = req.body.hora == null || req.body.hora === '' ? null : req.body.hora;
  if (time !== null && !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time)) throw new HttpError(400, 'La hora debe usar formato HH:MM.');
  const row = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query(`update public.asistencias set ${column} = $1 where id = $2 returning ${returningFields}`,
      [time, id]);
    return result.rows[0];
  });
  if (!row) throw new HttpError(404, 'No se encontró el registro de asistencia.');
  res.json(toAttendance(row));
}));

router.delete('/:id', requireRole('admin', 'rrhh'), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id, 'ID de asistencia');
  const result = await withUserTransaction(req.user.id, (db) => db.query(
    'delete from public.asistencias where id = $1 returning id', [id]
  ));
  if (!result.rows[0]) throw new HttpError(404, 'No se encontró el registro de asistencia.');
  res.json({ success: true, id });
}));

router.get('/pagos', asyncHandler(async (req, res) => {
  const desde = req.query.desde ? requireDate(String(req.query.desde), 'Fecha desde') : null;
  const hasta = req.query.hasta ? requireDate(String(req.query.hasta), 'Fecha hasta') : null;
  const rows = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query(
      `select t.id, t.dni, t.nombres, t.apellidos, t.cargo, t.salario_base, t.tarifa_por_hora,
         count(a.id) filter (where a.hora_entrada is not null and a.hora_salida is not null)::int as dias_registrados,
         coalesce(sum(case when a.hora_entrada is null or a.hora_salida is null then 0
           when a.hora_salida < a.hora_entrada then extract(epoch from (a.hora_salida - a.hora_entrada + interval '24 hour')) / 3600
           else extract(epoch from (a.hora_salida - a.hora_entrada)) / 3600 end), 0) as horas_acumuladas
       from public.trabajadores t
       left join public.asistencias a on a.trabajador_id = t.id
         and ($1::date is null or a.fecha >= $1) and ($2::date is null or a.fecha <= $2)
       where t.estado = 'Activo'
       group by t.id order by t.apellidos, t.nombres`, [desde, hasta]
    );
    return result.rows;
  });
  const pagos = rows.map((row) => {
    const salarioBase = Number(row.salario_base);
    const tarifaHora = Number(row.tarifa_por_hora);
    const horasAcumuladas = Number(row.horas_acumuladas);
    return {
      trabajador: { id: row.id, dni: row.dni, nombres: row.nombres, apellidos: row.apellidos },
      cargo: row.cargo,
      salarioBase,
      tarifaHora,
      horasAcumuladas,
      diasRegistrados: Number(row.dias_registrados),
      pagoEstimado: horasAcumuladas * tarifaHora,
    };
  });
  res.json({ pagos, totales: {
    totalHoras: pagos.reduce((sum, row) => sum + row.horasAcumuladas, 0),
    totalPago: pagos.reduce((sum, row) => sum + row.pagoEstimado, 0),
    totalSalarios: pagos.reduce((sum, row) => sum + row.salarioBase, 0),
    cantidadTrabajadores: pagos.length,
  } });
}));

export default router;
