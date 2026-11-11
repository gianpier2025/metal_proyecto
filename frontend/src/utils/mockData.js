import { CARGOS, ESTADOS_TRABAJADOR } from '../config.js';

const NOM = ['Carlos', 'Mar\u00eda', 'Jos\u00e9', 'Luis', 'Ana', 'Pedro', 'Diego', 'Rosa', 'Miguel', 'Elena',
  'Roberto', 'Carmen', 'Fernando', 'Patricia', 'Jorge', 'Sof\u00eda', 'Manuel', 'Luc\u00eda', 'Ra\u00fal', 'Paola'];
const APE = ['Quispe', 'Mamani', 'Huaman', 'Condori', 'Flores', 'Rojas', 'Vargas', 'Castillo',
  'Reyes', 'Gutierrez', 'Chavez', 'Salazar', 'Tello', 'Aguilar', 'Paredes', 'Espinoza'];
const DNIS = () => String(Math.floor(40000000 + Math.random() * 20000000));
const TEL = () => '9' + String(Math.floor(10000000 + Math.random() * 89999999));
const FECHA = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().split('T')[0];
};

const trabajadorIds = Array.from({ length: 12 }, (_, i) => i + 1);

export const mockTrabajadores = trabajadorIds.map((id) => {
  const nombre = NOM[id % NOM.length];
  const apellido = APE[id % APE.length];
  const cargo = CARGOS[id % CARGOS.length];
  const estados = Object.values(ESTADOS_TRABAJADOR);
  const estado = id < 10 ? estados[0] : estados[(id % 3)];
  return {
    id,
    dni: DNIS(),
    nombres: nombre,
    apellidos: apellido,
    cargo,
    estado: estado,
    telefono: TEL(),
    email: nombre.toLowerCase() + '.' + apellido.toLowerCase() + '@dbelecmec.com',
    fechaIngreso: FECHA(-(180 + id * 30)),
    direccion: 'Jr. Industrial ' + (id * 100) + ', Lima',
    salarioBase: 1500 + (id % 5) * 300,
    tarifaPorHora: 0,
  };
});

export const mockContratos = [];
trabajadorIds.forEach((tid) => {
  const dias = Math.random() < 0.25 ? -15 + Math.floor(Math.random() * 50) : 90 + Math.floor(Math.random() * 180);
  const tienePdf = Math.random() < 0.7;
  mockContratos.push({
    id: tid,
    trabajadorId: tid,
    fechaInicio: FECHA(-(180 + tid * 30)),
    fechaVencimiento: FECHA(dias),
    nombreArchivo: tienePdf ? 'Contrato_' + tid + '.pdf' : null,
    fechaSubida: tienePdf ? FECHA(-30) : null,
    tamanoKB: tienePdf ? Math.floor(150 + Math.random() * 800) : null,
  });
});

export const mockDocumentos = mockContratos;

export const mockAsistencia = [];
let rid = 1;
for (let dayOffset = -6; dayOffset <= 0; dayOffset++) {
  trabajadorIds.forEach((tid, idx) => {
    if (tid < 10 && dayOffset > -6) {
      const entrada = '0' + (6 + (idx % 2)) + ':' + ((idx * 5) % 60 < 10 ? '0' : '') + ((idx * 5) % 60);
      const tieneSalida = idx % 4 !== 0 || dayOffset < -1;
      const salidaHora = 16 + (idx % 2);
      const salidaMin = (idx * 7) % 60;
      mockAsistencia.push({
        id: rid++,
        trabajadorId: tid,
        fecha: FECHA(dayOffset),
        horaEntrada: entrada,
        horaSalida: tieneSalida ? String(salidaHora).padStart(2, '0') + ':' + String(salidaMin).padStart(2, '0') : null,
        estado: 'presente',
      });
    }
  });
}
