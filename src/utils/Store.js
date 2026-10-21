import { mockTrabajadores, mockDocumentos, mockAsistencia } from './mockData.js';

class Store {
  constructor() {
    this.listeners = [];
    this.state = {
      currentUser: JSON.parse(localStorage.getItem('db currentUser') || 'null'),
      trabajadores: [...mockTrabajadores],
      documentos: [...mockDocumentos],
      asistencia: [...mockAsistencia],
    };
  }

  get() {
    return this.state;
  }

  set(partial) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((fn) => fn(this.state));
  }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  login(user) {
    localStorage.setItem('db currentUser', JSON.stringify(user));
    this.set({ currentUser: user });
  }

  logout() {
    localStorage.removeItem('db currentUser');
    this.set({ currentUser: null });
  }

  isAuthenticated() {
    return this.state.currentUser !== null;
  }

  // ── Trabajadores ──
  addTrabajador(data) {
    const ids = this.state.trabajadores.map((t) => t.id);
    const id = ids.length ? Math.max(...ids) + 1 : 1;
    const nuevo = { id, ...data };
    this.set({ trabajadores: [...this.state.trabajadores, nuevo] });
    return nuevo;
  }

  updateTrabajador(id, data) {
    this.set({
      trabajadores: this.state.trabajadores.map((t) =>
        t.id === id ? { ...t, ...data } : t
      ),
    });
  }

  deleteTrabajador(id) {
    this.set({
      trabajadores: this.state.trabajadores.filter((t) => t.id !== id),
      documentos: this.state.documentos.filter((d) => d.trabajadorId !== id),
      asistencia: this.state.asistencia.filter((a) => a.trabajadorId !== id),
    });
  }

  getTrabajadorById(id) {
    return this.state.trabajadores.find((t) => t.id === id);
  }

  // ── Contratos ──
  uploadContrato(contratoId, fileInfo) {
    this.set({
      documentos: this.state.documentos.map((d) =>
        d.id === contratoId
          ? { ...d, nombreArchivo: fileInfo.name, fechaSubida: fileInfo.fechaSubida, tamanoKB: fileInfo.tamanoKB }
          : d
      ),
    });
  }

  removeContratoPdf(contratoId) {
    this.set({
      documentos: this.state.documentos.map((d) =>
        d.id === contratoId ? { ...d, nombreArchivo: null, fechaSubida: null, tamanoKB: null } : d
      ),
    });
  }

  // ── Asistencia ──
  registrarAsistencia(trabajadorId, tipo, fecha) {
    const fechaRegistro = fecha || new Date().toISOString().split('T')[0];
    const existing = this.state.asistencia.find(
      (a) => a.trabajadorId === trabajadorId && a.fecha === fechaRegistro
    );
    const now = new Date().toTimeString().slice(0, 5);

    if (existing) {
      this.set({
        asistencia: this.state.asistencia.map((a) =>
          a.id === existing.id
            ? { ...a, [tipo === 'entrada' ? 'horaEntrada' : 'horaSalida']: now, estado: 'presente' }
            : a
        ),
      });
    } else {
      const ids = this.state.asistencia.map((a) => a.id);
      const newId = ids.length ? Math.max(...ids) + 1 : 1;
      const nuevo = {
        id: newId,
        trabajadorId,
        fecha: fechaRegistro,
        horaEntrada: tipo === 'entrada' ? now : null,
        horaSalida: tipo === 'salida' ? now : null,
        estado: 'presente',
      };
      this.set({ asistencia: [...this.state.asistencia, nuevo] });
    }
  }

  corregirAsistencia(registroId, campo, hora) {
    this.set({
      asistencia: this.state.asistencia.map((a) =>
        a.id === registroId ? { ...a, [campo]: hora || null } : a
      ),
    });
  }

  deshacerAsistencia(registroId, campo) {
    this.set({
      asistencia: this.state.asistencia.map((a) =>
        a.id === registroId ? { ...a, [campo]: null } : a
      ),
    });
  }

  eliminarRegistroAsistencia(registroId) {
    this.set({
      asistencia: this.state.asistencia.filter((a) => a.id !== registroId),
    });
  }

  getAsistenciaHoy(fecha) {
    const fechaConsulta = fecha || new Date().toISOString().split('T')[0];
    return this.state.asistencia.filter((a) => a.fecha === fechaConsulta);
  }

  // ── Contratos: fechas ──
  actualizarFechasContrato(contratoId, fechaInicio, fechaVencimiento) {
    this.set({
      documentos: this.state.documentos.map((d) =>
        d.id === contratoId ? { ...d, fechaInicio, fechaVencimiento } : d
      ),
    });
  }
}

export const store = new Store();
