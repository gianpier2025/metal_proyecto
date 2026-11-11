import { requireSupabase } from './supabaseClient.js';

const ROLE_LABELS = {
  admin: 'Administrador',
  rrhh: 'Recursos Humanos',
  supervisor: 'Supervisor',
  consulta: 'Consulta',
};
const PROFILE_CACHE_MS = 60_000;
let cachedProfile = null;

async function loadProfile(authUser) {
  const client = requireSupabase();
  const { data: profile, error } = await client
    .from('profiles')
    .select('id, nombre, email, rol, activo')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) throw error;
  if (!profile) {
    await client.auth.signOut();
    throw new Error('La cuenta no tiene un perfil habilitado en el sistema. Contacte al administrador.');
  }
  if (!profile.activo) {
    await client.auth.signOut();
    throw new Error('Esta cuenta está desactivada. Contacte al administrador.');
  }

  const profileData = {
    id: profile.id,
    email: profile.email || authUser.email || '',
    name: profile.nombre || authUser.email || 'Usuario',
    role: profile.rol,
    roleLabel: ROLE_LABELS[profile.rol] || profile.rol,
    active: profile.activo,
  };
  cachedProfile = {
    userId: authUser.id,
    expiresAt: Date.now() + PROFILE_CACHE_MS,
    value: profileData,
  };
  return profileData;
}

export const authService = {
  async login(email, password) {
    if (!email || !password) throw new Error('Ingrese correo y contraseña');

    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Correo o contraseña incorrectos');

    try {
      return await loadProfile(data.user);
    } catch (profileError) {
      cachedProfile = null;
      await client.auth.signOut();
      throw profileError;
    }
  },

  async getCurrentUser() {
    const client = requireSupabase();
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    if (!session?.user) {
      cachedProfile = null;
      return null;
    }

    if (cachedProfile?.userId === session.user.id && cachedProfile.expiresAt > Date.now()) {
      return cachedProfile.value;
    }

    try {
      return await loadProfile(session.user);
    } catch (profileError) {
      cachedProfile = null;
      await client.auth.signOut();
      return null;
    }
  },

  async logout() {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    cachedProfile = null;
  },

  async resetPassword(email) {
    if (!email) throw new Error('Ingrese su correo electrónico');
    const client = requireSupabase();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  },

  async setPassword(password) {
    const client = requireSupabase();
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) throw new Error('El enlace de invitación venció o ya fue utilizado. Solicita una nueva invitación.');
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
  },
};
