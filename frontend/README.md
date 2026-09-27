# Frontend · NodoUni

Aplicación React + TypeScript con Vite y React Router. La identidad visual usa la paleta Academic Nexus, Plus Jakarta Sans servida localmente y los patrones de navegación y tarjetas del diseño de Stitch.

## Desarrollo

Requiere Node.js 22.12 o posterior (Docker usa Node 24).

```bash
cd frontend
npm ci
npm run dev
```

Abrir http://localhost:5173. El backend se ejecuta aparte en http://localhost:8080.

Vite reenvía `/api` y `/ws` a Quarkus y `/media` a MinIO en http://localhost:9000. El path `/media/<clave>` incluye el bucket `media`; no se elimina al reenviar. Se pueden cambiar los destinos mediante las variables locales `BACKEND_PROXY_TARGET` y `MEDIA_PROXY_TARGET`. Estas variables configuran el servidor de desarrollo y no se incluyen en el navegador.

El navegador usa siempre rutas del mismo origen. Así el cliente REST y el futuro cliente WebSocket pueden trabajar con el proxy local y con Nginx en producción sin direcciones de infraestructura incrustadas ni configuración CORS adicional.

## Alcance de la base (#6)

- Rutas: `/login`, `/registro`, `/feed`, `/explorar`, `/perfil`, `/usuarios/:id`, `/posts/:id` y `/chat`.
- Cliente único `src/lib/api.ts`: bearer token, errores `{ error, mensaje }`, respuestas 204, cancelación y FormData.
- Auth Context: token y perfil en `localStorage`, sincronización entre pestañas, expiración y cierre de sesión ante 401.
- Componentes reutilizables, tokens en `resources/style-guide.json` y fuentes locales.
- Las rutas son puntos de entrada: los formularios funcionales corresponden a #13, publicaciones/feed a #14 y el chat a su implementación posterior. No se incluyen usuarios ni publicaciones ficticias.

La persistencia en localStorage sigue el contrato de este proyecto. El JWT se adjunta como bearer y la autorización final siempre la valida Quarkus. No existe un endpoint de renovación de sesión; al expirar el token se requiere un nuevo login.

## Comprobaciones

```bash
npm run check
```

Ejecuta ESLint, revisión estructural de componentes, pruebas del cliente y la sesión, TypeScript y compilación de producción.

## Docker

Desde la raíz del repositorio:

```bash
docker build -t red-social-frontend ./frontend
docker run --rm -p 8081:80 red-social-frontend
```

La imagen compila con Node y sirve los archivos con Nginx. Incluye fallback a index.html para rutas de la SPA; devuelve 503 en las rutas de servicios hasta que la infraestructura configure los upstreams.

La configuración de proxy, el servicio Compose y el punto de entrada final en el puerto 8080 corresponden a #12. El responsable de infraestructura debe ampliar o sustituir `frontend/nginx-spa.conf`.
