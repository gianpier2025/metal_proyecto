import { HttpError } from './middleware/errors.js';

function dateOnly(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

export function requireUuid(value, label = 'Identificador') {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))) {
    throw new HttpError(400, `${label} no es válido.`);
  }
  return value;
}

export function requireDate(value, label = 'Fecha', optional = false) {
  if (optional && (value === null || value === undefined || value === '')) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, `${label} debe usar el formato AAAA-MM-DD.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new HttpError(400, `${label} no es una fecha válida.`);
  return value;
}

export function requireMoney(value, label, optional = false) {
  if (optional && (value === null || value === undefined || value === '')) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new HttpError(400, `${label} debe ser un número igual o mayor que cero.`);
  return number;
}

export function toWorker(row) {
  if (!row) return null;
  return {
    id: row.id,
    dni: row.dni,
    nombres: row.nombres,
    apellidos: row.apellidos,
    cargo: row.cargo,
    estado: row.estado,
    telefono: row.telefono,
    email: row.email,
    fechaIngreso: dateOnly(row.fecha_ingreso),
    direccion: row.direccion,
    salarioBase: Number(row.salario_base),
    tarifaPorHora: Number(row.tarifa_por_hora),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toAttendance(row) {
  if (!row) return null;
  const attendance = {
    id: row.id,
    trabajadorId: row.trabajador_id,
    fecha: dateOnly(row.fecha),
    horaEntrada: row.hora_entrada,
    horaSalida: row.hora_salida,
    estado: row.estado,
    observacion: row.observacion,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.trabajador_dni !== undefined) {
    attendance.trabajador = {
      id: row.trabajador_id,
      dni: row.trabajador_dni,
      nombres: row.trabajador_nombres,
      apellidos: row.trabajador_apellidos,
      cargo: row.trabajador_cargo,
      estado: row.trabajador_estado,
    };
  }
  return attendance;
}

export function toContract(row) {
  if (!row) return null;
  const contract = {
    id: row.id,
    trabajadorId: row.trabajador_id,
    modalidad: row.modalidad,
    fechaInicio: dateOnly(row.fecha_inicio),
    fechaVencimiento: dateOnly(row.fecha_vencimiento),
    archivoPath: row.archivo_path,
    nombreArchivo: row.nombre_archivo,
    fechaSubida: row.archivo_subido_at,
    tamanoBytes: row.archivo_tamano_bytes == null ? null : Number(row.archivo_tamano_bytes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.trabajador_dni !== undefined) {
    contract.trabajador = {
      id: row.trabajador_id,
      dni: row.trabajador_dni,
      nombres: row.trabajador_nombres,
      apellidos: row.trabajador_apellidos,
      cargo: row.trabajador_cargo,
    };
  }
  return contract;
}

export function requireNonEmptyString(value, label, maxLength = 250) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new HttpError(400, `${label} es obligatorio y debe tener como máximo ${maxLength} caracteres.`);
  }
  return value.trim();
}
