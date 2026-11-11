# Backend de Metal Proyecto

API Express para trabajadores, asistencias, contratos, reportes y administración de usuarios. Usa Supabase Auth para validar sesiones, PostgreSQL para los datos y el bucket privado `contratos` para archivos PDF.

## Desarrollo local

1. Copia `backend/.env.example` a `backend/.env`.
2. Completa `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` con los datos del proyecto `metal_proyecto`.
3. En Supabase, abre **Connect** y copia la URI de PostgreSQL del pooler de transacciones (puerto 6543) a `DATABASE_URL`. Sustituye el marcador de contraseña por la contraseña de base de datos del proyecto. No uses la contraseña de un usuario de Auth.
4. Si aparece un error de certificado TLS, descarga el certificado CA desde **Project Settings → Database → SSL Configuration**, guárdalo como `backend/prod-ca-2021.crt` y configura `DATABASE_SSL_CA_PATH=prod-ca-2021.crt` en `backend/.env`.
5. Instala dependencias desde la raíz con `npm install`.
6. Inicia la API con `npm run dev:backend`.
7. Consulta `GET /api/health`; debe responder `status: "ok"` cuando base de datos y Auth estén configurados.

## Publicar frontend y backend en Render

El archivo `render.yaml` define dos servicios para la rama `branch_gianpierre`: la API Node del workspace `backend` y el sitio estático Vite del workspace `frontend`. En Render, crea un **Blueprint** y conecta el repositorio de GitHub `metal_proyecto`. Render usará el `render.yaml` del repositorio para crear ambos servicios.

Al crear el Blueprint, completa las variables solicitadas para la API:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` y `DATABASE_URL` con los valores del proyecto correcto `metal_proyecto`.
- `DATABASE_URL` con la cadena de conexión PostgreSQL de Supabase y `DATABASE_SSL_CA_PATH` con `prod-ca-2021.crt` (ya definido en el Blueprint).
- `CLIENT_ORIGIN` con el origen HTTPS del sitio frontend, por ejemplo `https://metal-proyecto-frontend.onrender.com`.
- `AUTH_REDIRECT_URL` con ese dominio y `/?action=set-password`, por ejemplo `https://metal-proyecto-frontend.onrender.com/?action=set-password`.

Completa también en el servicio frontend `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con los valores del mismo proyecto Supabase. El Blueprint toma el host de la API desde Render y el frontend completa automáticamente el prefijo HTTPS y `/api`.

La dirección pública de la API se conecta automáticamente al frontend desde Render. Después del primer despliegue, agrega el valor exacto de `AUTH_REDIRECT_URL` a **Supabase → Authentication → URL Configuration → Redirect URLs**. La API publica su estado en `/api/health`.

Los servicios usan el plan gratuito de Render. La API gratuita se suspende tras 15 minutos sin tráfico y puede tardar alrededor de un minuto en despertar. Consulta las [limitaciones del plan gratuito de Render](https://render.com/docs/free) antes de usarlo en producción.

La clave publishable puede estar en el entorno del backend y frontend. `SUPABASE_SECRET_KEY` solo es necesaria para invitar usuarios desde la API: configúrala en el entorno seguro del servidor (por ejemplo, Render), nunca en el frontend ni en Git. Si no se configura, el resto de la API funciona y el endpoint de invitación responde que falta esa configuración. `AUTH_REDIRECT_URL` debe ser una URL permitida en la configuración de Auth de Supabase.

## Autenticación y permisos

El frontend inicia sesión con Supabase Auth y envía el token de sesión a la API en `Authorization: Bearer <access_token>`. La API verifica el token con Supabase Auth, consulta el perfil activo y ejecuta las consultas de PostgreSQL bajo el rol `authenticated` con el identificador del usuario, para que se apliquen las políticas RLS existentes.

- `admin`: acceso a usuarios y todas las operaciones.
- `rrhh`: administración de trabajadores, asistencias y contratos.
- `supervisor`: consulta de datos y registro/edición de asistencias.
- `consulta`: solo lectura.

## Rutas

Todas requieren sesión válida salvo `GET /api/health`.

| Recurso | Rutas principales |
| --- | --- |
| Trabajadores | `GET /api/trabajadores?q=...`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` (desactiva) |
| Asistencias | `GET /api/asistencias?fecha=YYYY-MM-DD`, `GET /resumen`, `GET /historial`, `GET /pagos`, `POST /marcar`, `PATCH /:id/hora`, `DELETE /:id` |
| Contratos | `GET /api/contratos`, `GET /alertas`, `POST /`, `PATCH /:id/fechas`, `POST /:id/archivo` (PDF hasta 10 MB), `GET /:id/archivo`, `DELETE /:id/archivo` |
| Reportes | `GET /api/reportes/dashboard?fecha=YYYY-MM-DD`, `GET /api/reportes/exportar` |
| Usuarios | `GET /api/usuarios`, `PATCH /:id`, `POST /api/usuarios/invitar` (admin) |

Las fechas usan `YYYY-MM-DD`. El alta de trabajador requiere `tarifaPorHora` porque la tarifa se ingresa manualmente. En Render configura `PORT` (Render lo proporciona), `CLIENT_ORIGIN` con el dominio del frontend, las variables `SUPABASE_*` necesarias y `DATABASE_URL`; si configuraste CA, incluye el certificado en el despliegue y define `DATABASE_SSL_CA_PATH=prod-ca-2021.crt`. Inicia con `npm start` desde el directorio `backend`.

El módulo Usuarios también usa esta API: un administrador puede invitar por correo, editar roles y desactivar el acceso. Las invitaciones comienzan con el rol Consulta; la persona abre el enlace, crea su contraseña y luego puede iniciar sesión. En Supabase, agrega `AUTH_REDIRECT_URL` a las URL permitidas. En Render, apunta esa variable a la URL del frontend publicado con `?action=set-password`. El backend valida el rol de administrador y usa `SUPABASE_SECRET_KEY` solamente en el entorno del servidor. En producción, define `VITE_API_BASE_URL` en el frontend con el dominio publicado del backend.
