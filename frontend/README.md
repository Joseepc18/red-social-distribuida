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

El navegador usa rutas del mismo origen. Así el cliente REST y el futuro cliente WebSocket trabajan con Vite en desarrollo y con Nginx en producción sin direcciones de infraestructura incrustadas ni configuración CORS adicional.

## Pantallas y rutas

| Ruta | Función |
|---|---|
| `/registro` | Registro con nombre, username, email y contraseña |
| `/login` | Inicio de sesión y regreso a la ruta privada solicitada |
| `/perfil` | Perfil propio, edición de nombre y bio, seguidores y seguidos |
| `/usuarios/:id` | Perfil ajeno, seguir/dejar de seguir y listas de conexiones |
| `/explorar?q=` | Búsqueda de usuarios por nombre o username |
| `/feed`, `/posts/:id` | Rutas reservadas para #14; muestran un estado de próxima disponibilidad |
| `/chat` | Ruta reservada para la futura integración WebSocket |

## Autenticación y datos (#13)

1. `POST /api/auth/registro` crea la cuenta y devuelve el perfil (201). La pantalla confirma el registro y dirige al login; no repite el registro ni presupone que devuelva un token.
2. `POST /api/auth/login` devuelve `{ token }`. El frontend consulta `GET /api/usuarios/me` con ese token antes de establecer la sesión.
3. Auth Context guarda token y perfil en localStorage, restaura la sesión al recargar y sincroniza cambios entre pestañas. Las rutas privadas validan el perfil con el servidor antes de mostrar su contenido. La expiración o una respuesta privada 401 requieren otro login.
4. `src/lib/api.ts` adjunta `Authorization: Bearer <token>`, preserva FormData, admite respuestas 204 y expone los errores `{ error, mensaje }`.
5. La edición usa `PUT /api/usuarios/me` y actualiza el Context. Seguir y dejar de seguir usan POST y DELETE de `/api/usuarios/{id}/seguir`; después se vuelven a consultar las listas.

Se usa REST para operaciones puntuales con respuesta, y Context para la sesión compartida sin otra biblioteca de estado. El estado de seguimiento se obtiene de la lista real de seguidores porque el perfil actual no contiene un campo `siguiendo`. No se inventan campos, contadores ni recomendaciones.

La persistencia en localStorage sigue el contrato del proyecto. La autorización definitiva siempre la valida Quarkus. No existe un endpoint de renovación de sesión; al expirar el token se requiere un nuevo login. Las contraseñas no se persisten.

El código de la aplicación consume la API real. Las respuestas simuladas existen solamente en las pruebas, sin modo de demostración ni sustitución automática cuando falla el backend.

## Comprobaciones

```bash
npm run check
npm run test:e2e
```

`check` ejecuta ESLint, revisión estructural de componentes, pruebas del cliente y la sesión, TypeScript y compilación de producción.

Las pruebas de navegador levantan Vite y controlan las respuestas REST para comprobar los flujos sin necesitar Docker. Para usar Brave desde PowerShell:

```powershell
$env:BROWSER_EXECUTABLE = 'C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'
npm run test:e2e
```

En otro entorno se puede proporcionar la ruta de otro navegador Chromium mediante `BROWSER_EXECUTABLE`, o instalar el navegador de Playwright con `npx playwright install chromium`.

Estas pruebas no sustituyen la validación de integración con Quarkus y Neo4j: para probar los servicios reales, levantar la aplicación completa con Compose como se indica a continuación.

## Docker y coordinación

Preparar `.env` y las claves JWT según el [README principal](../README.md#aplicación-completa-con-nginx-issue-12). Desde la raíz del repositorio:

```bash
docker compose up -d --build
```

La aplicación se abre en `http://localhost:8080`. La imagen compila con Node y sirve la SPA con Nginx, incluido el fallback a `index.html` para las rutas de React.

`nginx.conf` reenvía `/api` y `/ws` a `backend-1:8080`, y `/media` a `minio:9000` conservando el nombre del bucket. Requiere la red y los servicios de Compose. WebSocket usa HTTP/1.1, cabeceras de upgrade y un timeout de una hora; los logs de acceso omiten la query y el Referer, y se descartan los errores de `/ws` porque pueden incluir el token. El chat se implementa en una tarea posterior.

### Dependencias para #14

Se requieren los contratos implementados y publicados de #10 y #11:

- `POST /api/posts` con `texto` y `archivo` opcional; límites y tipos de imagen.
- `GET /api/posts/{id}` y `GET /api/usuarios/{id}/posts`.
- `GET /api/feed?page=`: estructura de página, tamaño y señal de fin.
- Campos de autor, reacciones, imagen y regla de URL pública mediante `/media`.

Los módulos backend de publicaciones y feed todavía son paquetes vacíos en la base usada. #14 queda pendiente; tampoco se incluyen el protocolo ActivityPub, cifrado de extremo a extremo ni otras funciones decorativas del prototipo que no existen en el alcance acordado.
