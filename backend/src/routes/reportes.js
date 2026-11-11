import { Router } from 'express';
import { withUserTransaction } from '../config/db.js';
import { asyncHandler } from '../middleware/errors.js';
import { requireDate, toContract } from '../utils.js';

const router = Router();

function getContractStatus(contract) {
  if (!contract.nombreArchivo) return ['SIN_PDF', 'Sin PDF'];
  if (!contract.fechaVencimiento) return ['SIN_FECHA', 'Sin fecha'];
  const days = Math.ceil((Date.parse(`${contract.fechaVencimiento}T00:00:00Z`) - Date.now()) / 86_400_000);
  if (days < 0) return ['VENCIDO', 'Vencido'];
  if (days <= 30) return ['POR_VENCER', 'Por vencer'];
  return ['AL_DIA', 'Vigente'];
}

router.get('/dashboard', asyncHandler(async (req, res) => {
  const date = requireDate(String(req.query.fecha || new Date().toISOString().slice(0, 10)), 'Fecha');
  const data = await withUserTransaction(req.user.id, async (db) => {
    const totals = await db.query(
      `select count(*)::int as total,
         count(*) filter (where estado = 'Activo')::int as activos,
         count(*) filter (where estado = 'Inactivo')::int as inactivos
       from public.trabajadores`
    );
    const attendance = await db.query(
      `select count(a.id)::int as presentes,
         count(a.id) filter (where a.hora_entrada <= time '07:15')::int as puntuales
       from public.trabajadores t
       left join public.asistencias a on a.trabajador_id = t.id and a.fecha = $1
       where t.estado = 'Activo'`, [date]
    );
    const distribution = await db.query(
      `select cargo, count(*)::int as cantidad
       from public.trabajadores group by cargo order by cantidad desc, cargo`
    );
    const contracts = await db.query(
      `select count(*) filter (where archivo_path is null)::int as sin_pdf,
         count(*) filter (where archivo_path is not null and fecha_vencimiento is null)::int as sin_fecha,
         count(*) filter (where archivo_path is not null and fecha_vencimiento < $1)::int as vencidos,
         count(*) filter (where archivo_path is not null and fecha_vencimiento >= $1 and fecha_vencimiento <= $1 + 30)::int as por_vencer,
         count(*) filter (where archivo_path is not null and fecha_vencimiento > $1 + 30)::int as vigentes
       from public.contratos`, [date]
    );
    const alerts = await db.query(
      `select c.id, c.trabajador_id, c.modalidad, c.fecha_inicio, c.fecha_vencimiento,
         c.archivo_path, c.nombre_archivo, c.archivo_subido_at, c.archivo_tamano_bytes,
         c.created_at, c.updated_at,
         t.dni as trabajador_dni, t.nombres as trabajador_nombres,
         t.apellidos as trabajador_apellidos, t.cargo as trabajador_cargo,
         (c.fecha_vencimiento - $1::date)::int as dias_restantes
       from public.contratos c join public.trabajadores t on t.id = c.trabajador_id
       where c.archivo_path is not null and c.fecha_vencimiento <= $1 + 30
       order by c.fecha_vencimiento asc limit 5`, [date]
    );
    return {
      totals: totals.rows[0],
      attendance: attendance.rows[0],
      distribution: distribution.rows,
      contracts: contracts.rows[0],
      alerts: alerts.rows,
    };
  });
  const present = Number(data.attendance.presentes);
  res.json({
    totalTrabajadores: Number(data.totals.total),
    trabajadoresActivos: Number(data.totals.activos),
    trabajadoresInactivos: Number(data.totals.inactivos),
    trabajadoresPorCargo: data.distribution.map((row) => ({ cargo: row.cargo, cantidad: Number(row.cantidad) })),
    puntualidadHoy: present ? Math.round(Number(data.attendance.puntuales) / present * 100) : 0,
    presentesHoy: present,
    contratosVencidos: Number(data.contracts.vencidos),
    contratosPorVencer: Number(data.contracts.por_vencer),
    contratosSinPdf: Number(data.contracts.sin_pdf),
    contratosSinFecha: Number(data.contracts.sin_fecha),
    contratosVigentes: Number(data.contracts.vigentes),
    alertasContratos: data.alerts.map((row) => ({
      ...toContract(row),
      trabajador: {
        dni: row.trabajador_dni,
        nombres: row.trabajador_nombres,
        apellidos: row.trabajador_apellidos,
        cargo: row.trabajador_cargo,
      },
      diasRestantes: Number(row.dias_restantes),
      estadoKey: getContractStatus(toContract(row))[0],
    })),
  });
}));

router.get('/exportar', asyncHandler(async (req, res) => {
  const rows = await withUserTransaction(req.user.id, async (db) => {
    const result = await db.query(
      `select t.id, t.dni, t.nombres, t.apellidos, t.cargo, t.estado, t.salario_base, t.tarifa_por_hora,
         c.contrato_id, c.fecha_vencimiento, c.nombre_archivo, c.archivo_path
       from public.trabajadores t
       left join lateral (
         select id as contrato_id, fecha_vencimiento, nombre_archivo, archivo_path
         from public.contratos c where c.trabajador_id = t.id
         order by c.fecha_inicio desc, c.created_at desc limit 1
       ) c on true
       order by t.apellidos, t.nombres`
    );
    return result.rows;
  });
  const today = new Date().toISOString().slice(0, 10);
  res.json(rows.map((row) => {
    let contractStatus = row.contrato_id ? 'Sin PDF' : 'Sin contrato';
    if (row.archivo_path) {
      if (!row.fecha_vencimiento) contractStatus = 'Sin fecha';
      else {
        const days = Math.ceil((Date.parse(`${row.fecha_vencimiento}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
        contractStatus = days < 0 ? 'Vencido' : days <= 30 ? 'Por vencer' : 'Vigente';
      }
    }
    return {
      Nombres: `${row.nombres} ${row.apellidos}`,
      DNI: row.dni,
      Cargo: row.cargo,
      Estado: row.estado,
      SalarioBase: Number(row.salario_base),
      TarifaPorHora: Number(row.tarifa_por_hora),
      EstadoContrato: contractStatus,
      FechaVencimiento: row.fecha_vencimiento || '',
    };
  }));
}));

export default router;
