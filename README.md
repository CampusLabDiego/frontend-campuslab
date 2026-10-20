# Frontend CampusLab

Aplicación Angular para gestionar recursos académicos, reservas,
notificaciones, documentos y auditoría.

## Acceso público

https://wktaaga6j4.execute-api.us-east-1.amazonaws.com

## Tecnologías

- Angular y TypeScript.
- Microsoft Authentication Library: MSAL.
- Microsoft Entra ID.
- HttpClient.
- Nginx y Docker.

## Autenticación

MSAL realiza el inicio y cierre de sesión con Microsoft Entra ID.

El interceptor adjunta el Access Token a las peticiones protegidas.
Los guards controlan la navegación por sesión y rol.

La autorización también se aplica en el backend.

Configuración principal:

```text
src/app/core/auth/msal-config.ts
src/app/core/auth/role.guard.ts
src/app/app.routes.ts
```

El scope solicitado es:

```text
api://3bdd9813-1e51-4686-a89a-760ac0531de9/access_as_user
```

La redirección utiliza el origen desde el que se abre la aplicación.
Ese origen debe estar registrado como SPA en Entra ID.

## Módulos

- Dashboard: usuario y accesos según rol.
- Catálogo: consulta y administración de recursos.
- Reservas: creación, consulta y gestión de estados.
- Notificaciones: tareas, correos y descarga de documentos PDF.
- Auditoría: historial de eventos con búsqueda y paginación.
- Administración RabbitMQ: colas, exchanges y bindings.

Reportería todavía está pendiente como módulo de negocio.

## Roles

- Cliente: consulta catálogo, administra el flujo permitido de sus
  reservas y consulta sus notificaciones/documentos.
- Operador: gestiona reservas y consulta notificaciones/documentos.
- Admin: administra recursos, reservas y RabbitMQ; consulta auditoría.
- Auditor: consulta auditoría.

## Desarrollo local

Instalar dependencias desde el lockfile:

```powershell
npm ci
```

Iniciar:

```powershell
npm start
```

Dirección local:

```text
http://localhost:4200
```

El backend se consume mediante API Gateway, configurado en API_BASE_URL.

## Compilación

```powershell
npm run build
```

La salida utilizada por Docker es:

```text
dist/frontend-campuslab/browser
```

## Despliegue

El Dockerfile compila Angular y sirve el resultado mediante Nginx.

nginx.conf configura el fallback a index.html para permitir recargar
rutas como /dashboard, /bookings y /audit.

En EC2, el contenedor se publica en el puerto 4200 del host.
API Gateway entrega el frontend por HTTPS.

La guía completa de despliegue está en infra-campuslab.

## Auditoría

La vista consulta hasta 500 eventos recientes.

Distingue entre:

- Usuario que solicita un cambio.
- Sistema automático que confirma o rechaza el resultado.
- Operación de stock que relaciona ambos eventos.

El historial comienza desde la activación de la auditoría.