import { store } from '../utils/Store.js';

function delay(data, ms = 250) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

export const trabajadoresService = {
  async getAll() {
    return delay([...store.get().trabajadores]);
  },

  async getById(id) {
    return delay(store.getTrabajadorById(id));
  },

  async search(query) {
    const q = query.toLowerCase().trim();
    const results = store.get().trabajadores.filter((t) => {
      if (!q) return true;
      return (
        `${t.nombres} ${t.apellidos}`.toLowerCase().includes(q) ||
        t.dni.includes(q) ||
        t.cargo.toLowerCase().includes(q)
      );
    });
    return delay(results);
  },

  async create(data) {
    return delay(store.addTrabajador(data));
  },

  async update(id, data) {
    return delay(store.updateTrabajador(id, data));
  },

  async remove(id) {
    store.deleteTrabajador(id);
    return delay({ success: true });
  },
};
