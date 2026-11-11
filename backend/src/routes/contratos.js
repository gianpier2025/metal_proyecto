import express, { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { withUserTransaction } from '../config/db.js';
import { HttpError, asyncHandler } from '../middleware/errors.js';
import { requireRole } from '../middleware/auth.js';
import { requireDate, requireUuid, requireNonEmptyString, toContract } from '../utils.js';

const router = Router();
const fields = `c.id, c.trabajador_id, c.modalidad, c.fecha_inicio, c.fecha_vencimiento,
  c.archivo_path, c.nombre_archivo, c.archivo_subido_at, c.archivo_tamano_bytes, c.created_at, c.updated_at`;
const returningFields = `id, trabajador_id, modalidad, fecha_inicio, fecha_vencimiento,
  archivo_path, nombre_archivo, archivo_subido_at, archivo_tamano_bytes, created_at, updated_at`;
const joinedFields = `, t.dni as trabajador_dni, t.nombres as trabajador_nombres,
  t.apellidos as trabajador_apellidos, t.cargo as trabajador_cargo`;
const join = 'left join public.trabajadores t on t.id = c.trabajador_id';
const modalities = new Set([
  'Plazo Fijo (Sujeto a Modalidad)',
  'Indeterminado / Indefinido',
  'Por Obra o Servicio Específico',
  'Tiempo Parcial (Part-time)',
]);

function contractStatus(contract) {
  if (!contract.nombreArchivo) return ['SIN_PDF', 'Sin PDF', 'secondary', 'file-earmark-excel'];
  if (!contract.fechaVencimiento) return ['SIN_FECHA', 'Sin fecha', 'secondary', 'calendar-x'];
  const days = Math.ceil((Date.parse(`${contract.fechaVencimiento}T00:00:00Z`) - Date.now()) / 86_400_000);
  if (days < 0) return ['VENCIDO', 'Vencido', 'danger', 'x-circle'];
  if (days <= 30) return ['POR_VENCER', 'Por vencer', 'warning', 'exclamation-triangle'];
  return ['AL_DIA', 'Vigente', 'success', 'check-circle'];
}

function enrich(row) {
  const contract = toContract(row);
  contract.estadoKey = contractStatus(contract)[0];
  [contract.estadoKey, contract.estadoLabel, contract.estadoVariant, contract.estadoIcon] = contractStatus(contract);
  return contract;
}

function storageConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new HttpError(503, 'Falta configurar Supabase Storage en el backend.');
  return { url, key };
}

function objectUrl(baseUrl, path) {
  return `${baseUrl}/storage/v1/object/contratos/${path.split('/').map(encodeURIComponent).join('/')}`;
}

async function deleteStorageObject(req, path) {
  const { url, key } = storageConfig();
  const response = await fetch(`${url}/storage/v1/object/contratos`, {
    method: 'DELETE',
    headers: {
      apikey: key,
      Authorization: `Bearer ${req.user.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefixes: [path] }),
  });
  if (!response.ok) throw new HttpError(502, 'No se pudo eliminar el PDF de Storage.');
}

router.get('/', requireRole('admin', 'rrhh', 'consulta'), asyncHandler(async (req, res) => {
  const rows = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query(`select ${fields}${joinedFields} from public.contratos c ${join} order by c.fecha_inicio desc, c.created_at desc`);
    return result.rows;
  });
  res.json(rows.map(enrich));
}));

router.get('/alertas', requireRole('admin', 'rrhh', 'consulta'), asyncHandler(async (req, res) => {
  const rows = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query(`select ${fields}${joinedFields} from public.contratos c ${join} order by c.fecha_vencimiento`);
    return result.rows;
  });
  res.json(rows.map(enrich).filter((contract) => ['VENCIDO', 'POR_VENCER'].includes(contract.estadoKey)));
}));

router.post('/', requireRole('admin', 'rrhh'), asyncHandler(async (req, res) => {
  const trabajadorId = requireUuid(req.body.trabajadorId, 'ID de trabajador');
  const modalidad = requireNonEmptyString(req.body.modalidad, 'Modalidad', 100);
  if (!modalities.has(modalidad)) throw new HttpError(400, 'La modalidad de contrato no es válida.');
  const fechaInicio = requireDate(req.body.fechaInicio, 'Fecha de inicio');
  const fechaVencimiento = requireDate(req.body.fechaVencimiento, 'Fecha de vencimiento', true);
  if (fechaVencimiento && fechaVencimiento < fechaInicio) throw new HttpError(400, 'La fecha de vencimiento debe ser posterior al inicio.');
  const row = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query(
      `insert into public.contratos (trabajador_id, modalidad, fecha_inicio, fecha_vencimiento)
       values ($1,$2,$3,$4) returning ${returningFields}`,
      [trabajadorId, modalidad, fechaInicio, fechaVencimiento]
    );
    return result.rows[0];
  });
  res.status(201).json(enrich(row));
}));

router.patch('/:id/fechas', requireRole('admin', 'rrhh'), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id, 'ID de contrato');
  const fechaInicio = requireDate(req.body.fechaInicio, 'Fecha de inicio');
  const fechaVencimiento = requireDate(req.body.fechaVencimiento, 'Fecha de vencimiento', true);
  if (fechaVencimiento && fechaVencimiento < fechaInicio) throw new HttpError(400, 'La fecha de vencimiento debe ser posterior al inicio.');
  const row = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query(
      `update public.contratos set fecha_inicio = $1, fecha_vencimiento = $2 where id = $3 returning ${returningFields}`,
      [fechaInicio, fechaVencimiento, id]
    );
    return result.rows[0];
  });
  if (!row) throw new HttpError(404, 'No se encontró el contrato.');
  res.json(enrich(row));
}));

router.post('/:id/archivo', requireRole('admin', 'rrhh'), express.raw({ type: 'application/pdf', limit: '10mb' }), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id, 'ID de contrato');
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new HttpError(400, 'Envía un archivo PDF.');
  if (req.body.length > 10 * 1024 * 1024) throw new HttpError(413, 'El PDF supera el máximo de 10 MB.');
  if (req.get('content-type')?.split(';')[0].trim() !== 'application/pdf' || req.body.subarray(0, 5).toString() !== '%PDF-') {
    throw new HttpError(400, 'El archivo enviado no es un PDF válido.');
  }

  const record = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query('select id, trabajador_id from public.contratos where id = $1', [id]);
    return result.rows[0];
  });
  if (!record) throw new HttpError(404, 'No se encontró el contrato.');

  const safeName = String(req.query.nombre || 'contrato.pdf').split(/[\\/]/).pop().replace(/[^\p{L}\p{N}._-]/gu, '_').slice(0, 120) || 'contrato.pdf';
  const path = `${record.trabajador_id}/${record.id}/${randomUUID()}-${safeName}`;
  const { url, key } = storageConfig();
  const upload = await fetch(objectUrl(url, path), {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${req.user.accessToken}`,
      'Content-Type': 'application/pdf',
      'x-upsert': 'true',
    },
    body: req.body,
  });
  if (!upload.ok) throw new HttpError(502, 'Supabase Storage rechazó la carga del PDF.');

  try {
    const updated = await withUserTransaction(req.user.id, async (db) => {
      const result = await db.query(
        `update public.contratos set archivo_path = $1, nombre_archivo = $2,
          archivo_subido_at = now(), archivo_tamano_bytes = $3 where id = $4 returning ${returningFields}`,
        [path, safeName, req.body.length, id]
      );
      return result.rows[0];
    });
    if (!updated) throw new HttpError(404, 'No se encontró el contrato.');
    res.json(enrich(updated));
  } catch (error) {
    await deleteStorageObject(req, path).catch(() => {});
    throw error;
  }
}));

router.delete('/:id/archivo', requireRole('admin', 'rrhh'), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id, 'ID de contrato');
  const row = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query('select archivo_path from public.contratos where id = $1', [id]);
    return result.rows[0];
  });
  if (!row) throw new HttpError(404, 'No se encontró el contrato.');
  if (row.archivo_path) await deleteStorageObject(req, row.archivo_path);
  await withUserTransaction(req.user.id, (db) => db.query(
    `update public.contratos set archivo_path = null, nombre_archivo = null,
       archivo_subido_at = null, archivo_tamano_bytes = null where id = $1`, [id]
  ));
  res.json({ success: true });
}));

router.get('/:id/archivo', requireRole('admin', 'rrhh', 'consulta'), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id, 'ID de contrato');
  const row = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query('select archivo_path, nombre_archivo from public.contratos where id = $1', [id]);
    return result.rows[0];
  });
  if (!row) throw new HttpError(404, 'No se encontró el contrato.');
  if (!row.archivo_path) throw new HttpError(404, 'Este contrato no tiene PDF.');
  const { url, key } = storageConfig();
  const file = await fetch(objectUrl(url, row.archivo_path), {
    headers: { apikey: key, Authorization: `Bearer ${req.user.accessToken}` },
  });
  if (!file.ok) throw new HttpError(502, 'No se pudo descargar el PDF de Storage.');
  res.setHeader('Content-Type', 'application/pdf');
  const filename = String(row.nombre_archivo || 'contrato.pdf').replace(/[\r\n]/g, '_');
  res.setHeader('Content-Disposition', `inline; filename="contrato.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send(Buffer.from(await file.arrayBuffer()));
}));

export default router;
