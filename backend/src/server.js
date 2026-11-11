import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { databaseConfigured, pool, closePool } from './config/db.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errors.js';
import trabajadoresRouter from './routes/trabajadores.js';
import asistenciasRouter from './routes/asistencias.js';
import contratosRouter from './routes/contratos.js';
import usuariosRouter from './routes/usuarios.js';
import reportesRouter from './routes/reportes.js';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('El origen no está permitido por CORS.'));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res) => {
  const authConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
  let database = 'not_configured';
  if (databaseConfigured && pool) {
    try {
      await pool.query('select 1');
      database = 'connected';
    } catch (error) {
      console.error('Database health check failed:', error.code || error.name, error.message);
      database = 'unavailable';
    }
  }
  const ok = database === 'connected' && authConfigured;
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    service: 'metal-proyecto-api',
    database,
    auth: authConfigured ? 'configured' : 'not_configured',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/trabajadores', requireAuth, trabajadoresRouter);
app.use('/api/asistencias', requireAuth, asistenciasRouter);
app.use('/api/contratos', requireAuth, contratosRouter);
app.use('/api/reportes', requireAuth, reportesRouter);
app.use('/api/usuarios', requireAuth, usuariosRouter);

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta de API no encontrada.' }));
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`API de Metal Proyecto escuchando en el puerto ${PORT}`);
});

async function shutdown(signal) {
  console.log(`${signal}: cerrando la API...`);
  server.close(async () => {
    await closePool().catch((error) => console.error('Error cerrando PostgreSQL:', error.message));
    process.exit(0);
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

export default app;
