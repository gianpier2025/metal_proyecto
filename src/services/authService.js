const ADMIN_CREDENTIALS = { user: 'admin', password: 'admin123' };

function simulateDelay(data, ms = 300) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

export const authService = {
  async login(user, password) {
    if (!user || !password) {
      throw new Error('Ingrese usuario y contraseña');
    }
    if (user === ADMIN_CREDENTIALS.user && password === ADMIN_CREDENTIALS.password) {
      return simulateDelay({
        user,
        name: 'Administrador',
        role: 'admin',
        token: btoa(`${user}:${Date.now()}`),
      });
    }
    await simulateDelay(null, 400);
    throw new Error('Credenciales incorrectas');
  },
};
