export class HttpError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message, details: error.details });
  }

  if (error.code === '23505') {
    return res.status(409).json({ error: 'Ya existe un registro con esos datos.' });
  }
  if (error.code === '23503') {
    return res.status(400).json({ error: 'La referencia indicada no existe o aún tiene historial asociado.' });
  }
  if (error.code === '23514' || error.code === '22P02' || error.code === '22007') {
    return res.status(400).json({ error: 'Los datos enviados no cumplen el formato requerido.' });
  }
  if (error.code === '42501') {
    return res.status(403).json({ error: 'Tu rol no tiene permiso para realizar esta operación.' });
  }

  console.error('API error:', error.message);
  return res.status(500).json({ error: 'Ocurrió un error interno en el servidor.' });
}
