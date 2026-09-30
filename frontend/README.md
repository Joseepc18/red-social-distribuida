# Frontend · NodoUni

Aplicación React + TypeScript con Vite y React Router. La identidad visual combina superficies claras y limpias, texto oscuro y un tema oscuro ciruela grafito, con acentos violetas propios de NodoUni. Usa Plus Jakarta Sans servida localmente y los patrones de navegación y tarjetas del diseño de Stitch.

## Desarrollo

Requiere Node.js 22.12 o posterior (Docker usa Node 24).

```bash
cd frontend
npm ci
npm run dev
```

Abrir http://localhost:5173. El backend se ejecuta aparte en http://localhost:8080.

Vite reenvía `/api` y `/ws` a Quarkus y `/media` a MinIO en http://localhost:9000. El path `/media/<clave>` incluye el bucket `media`; no se elimina al reenviar. Se pueden cambiar los destinos mediante las variables locales `BACKEND_PROXY_TARGET` y `MEDIA_PROXY_TARGET`. Estas variables configuran el servidor de desarrollo y no se incluyen en el navegador.

El navegador usa rutas del mismo origen. Así el cliente REST y el cliente WebSocket trabajan con Vite en desarrollo y con Nginx en producción sin direcciones de infraestructura incrustadas ni configuración CORS adicional.

## Pantallas y rutas

| Ruta | Función |
|---|---|
| `/registro` | Registro con nombre, username, email y contraseña |
| `/login` | Inicio de sesión y regreso a la ruta privada solicitada |
| `/perfil` | Perfil propio, edición de nombre y bio, seguidores y seguidos |
| `/usuarios/:id` | Perfil ajeno, seguir/dejar de seguir y listas de conexiones |
| `/explorar?q=` | Búsqueda de usuarios por nombre o username |
| `/feed` | Inicio abre en Siguiendo con el feed paginado real; Para ti muestra publicaciones recomendadas en la segunda pestaña |
| `/descubrir` | Redirige a Para ti en Inicio para evitar dos entradas a las mismas recomendaciones |
| `/posts/:id` | Detalle de publicación, también accesible desde Web Push |
| `/chat` | Lista de conversaciones e historial de mensajes en tiempo real |
| `/configuracion` | Tema de este navegador y controles de notificaciones Web Push |

## Autenticación y datos

1. `POST /api/auth/registro` crea la cuenta y devuelve el perfil (201). La pantalla confirma el registro y dirige al login; no repite el registro ni presupone que devuelva un token.
2. `POST /api/auth/login` devuelve `{ token }`. El frontend consulta `GET /api/usuarios/me` con ese token antes de establecer la sesión. El guard de rutas reutiliza esa validación durante el acceso inicial, sin repetir la petición; al recargar o recibir cambios de sesión desde otra pestaña, vuelve a validar con el servidor.
3. Auth Context guarda token y perfil en localStorage, restaura la sesión al recargar y sincroniza cambios entre pestañas. Las rutas privadas validan el perfil con el servidor antes de mostrar su contenido. La expiración o una respuesta privada 401 requieren otro login.
4. `src/lib/api.ts` adjunta `Authorization: Bearer <token>`, preserva FormData, admite respuestas 204 y expone los errores `{ error, mensaje }`.
5. La edición usa `PUT /api/usuarios/me` y actualiza el Context. Seguir y dejar de seguir usan POST y DELETE de `/api/usuarios/{id}/seguir`; después se vuelven a consultar las listas.

Se usa REST para operaciones puntuales con respuesta, y Context para la sesión compartida sin otra biblioteca de estado. El estado de seguimiento se obtiene de la lista real de seguidores porque el perfil actual no contiene un campo `siguiendo`. No se inventan campos, contadores ni recomendaciones.

La persistencia en localStorage sigue el contrato del proyecto. La autorización definitiva siempre la valida Quarkus. No existe un endpoint de renovación de sesión; al expirar el token se requiere un nuevo login. Las contraseñas no se persisten.

## Chat en tiempo real

El perfil de otra persona permite iniciar o recuperar una conversación con `POST /api/conversaciones`. La ruta privada `/chat` lista las conversaciones con `GET /api/conversaciones` y carga el historial con `GET /api/conversaciones/{id}/mensajes`. El cursor `siguienteAntes` se reenvía sin cambios como `?antes=` para cargar mensajes anteriores.

AppLayout mantiene un ChatProvider por sesión y una sola conexión al navegar entre rutas privadas. En escritorio, la burbuja abre la lista o una conversación flotante; en móvil abre `/chat`. La conversación completa y la flotante comparten historial, borrador e indicador de mensajes nuevos, que se conserva solo durante la sesión.

Los mensajes nuevos se envían y reciben por WebSocket en `/ws/chat?token=<JWT>`. El cliente elige `ws` o `wss` según el origen, reconecta con espera exponencial hasta 30 segundos y vuelve a consultar el historial tras reconectar. Combina eventos y respuestas REST por id, así recupera mensajes persistidos mientras la conexión estuvo cerrada y evita duplicados. No consulta el servidor mediante polling.

El código de la aplicación consume la API real. Las respuestas simuladas existen solamente en las pruebas, sin modo de demostración ni sustitución automática cuando falla el backend.

Los textos estáticos de la interfaz se centralizan en `src/content/copy.ts`; ese archivo no contiene usuarios ni publicaciones simuladas.

## Grafo social

En `/explorar`, sin una búsqueda activa, aparecen sugerencias con las conexiones que las explican y un botón para seguir. Cuando no sigues a nadie, se muestra la cantidad de seguidores que devuelve el servidor. Debajo se presenta el alcance de tu red con la distancia mínima, hasta tres pasos. Al seguir una sugerencia se actualizan ambas secciones.

El perfil de otra persona muestra los seguidos en común y los grados de separación, con la cadena de nombres de usuario o un mensaje cuando no existe un camino dentro de seis pasos. El alcance respeta la dirección de las relaciones; la separación admite ambos sentidos, según el contrato del backend.

Las consultas se realizan mediante el cliente REST compartido: React pide las proyecciones a Quarkus, Quarkus consulta Neo4j y la interfaz muestra el resultado. No se calcula un grafo alternativo en el navegador ni se inventan recomendaciones. Cada sección tiene carga, estado vacío y reintento independientes.

Las sesiones restauradas se validan una vez contra el servidor. Sincronizar cambios del perfil entre pestañas conserva esa validación si el token sigue siendo el mismo; un token distinto requiere validarse otra vez.

## Notificaciones Web Push

La opción **Configuración** del menú de cuenta ofrece **Activar notificaciones**. La revisión de la suscripción sigue montada en el layout privado. El permiso se solicita únicamente al pulsar ese botón. Se registra `/sw.js`, se obtiene `clavePublica` desde `GET /api/push/clave-publica` y se crea una suscripción con `userVisibleOnly: true`. El cliente envía `{ endpoint, p256dh, auth }` a `POST /api/push/suscripciones` con el JWT.

El backend consulta los seguidores en Neo4j y envía el aviso cifrado al servicio push del navegador. Ese servicio despierta al Service Worker, que muestra `titulo` y `cuerpo` aunque la aplicación esté cerrada. Al pulsar el aviso se enfoca una pestaña existente o se abre la publicación indicada por `url`. Solo se aceptan destinos `/posts/{id}` del mismo origen.

**Desactivar notificaciones** elimina la suscripción mediante `DELETE /api/push/suscripciones` y ejecuta `unsubscribe()`. Se intenta la limpieza local incluso si el servidor no responde. Al cerrar sesión o cambiar de cuenta también se desactiva la suscripción anterior para evitar avisos de otra cuenta en un equipo compartido.

El Service Worker conserva únicamente el propietario y endpoint de la suscripción en Cache Storage; no almacena JWT ni respuestas privadas, y no intercepta peticiones. Las operaciones se serializan entre pestañas mediante Web Locks donde esté disponible. Si el permiso está bloqueado, la interfaz indica cómo cambiarlo; si faltan las claves VAPID del servidor, muestra su error sin fingir una activación.

Se requiere HTTPS o localhost, permiso de notificaciones y las variables VAPID descritas en el README del backend. En Brave puede ser necesario habilitar **Usar los servicios de Google para la mensajería push** en los ajustes de privacidad. El permiso del sitio por sí solo no activa ese servicio. El navegador debe poder ejecutarse en segundo plano para recibir avisos con todas las pestañas de la aplicación cerradas.

## Comprobaciones del frontend

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

### Integración con el backend real

Las pruebas de integración están separadas de las respuestas controladas. Requieren Quarkus y Neo4j en un entorno de pruebas: crean dos cuentas con prefijo `qa_` por ejecución y comprueban persistencia al recargar. No interceptan las peticiones HTTP.

Con el backend disponible en el puerto 8080:

```powershell
$env:BROWSER_EXECUTABLE = 'C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'
npm run test:integration
```

El comando inicia Vite automáticamente. Para un backend en otro puerto, configurar `BACKEND_PROXY_TARGET` antes de ejecutarlo. Para comprobar una aplicación ya servida por Nginx, configurar `INTEGRATION_BASE_URL` con su URL; en ese caso no se inicia Vite.

Para probar la aplicación completa con los servicios reales, levantarla con Compose como se indica a continuación y ejecutar las pruebas con `INTEGRATION_BASE_URL=http://localhost:8080`.

## Docker y coordinación

Preparar `.env` y las claves JWT según el [README principal](../README.md#configuración-inicial). Desde la raíz del repositorio:

```bash
docker compose up -d --build
```

La aplicación se abre en `http://localhost:8080`. La imagen compila con Node y sirve la SPA con Nginx, incluido el fallback a `index.html` para las rutas de React.

El proxy admite peticiones de hasta 6 MiB para las publicaciones con imágenes de hasta 5 MiB (el backend valida el archivo). Compose permite configurar `MEDIA_PUBLIC_URL`; su valor predeterminado `/media/` conserva el mismo origen del navegador.

`nginx.conf` reparte `/api` y `/ws` entre `backend-1:8080` y `backend-2:8080` (`upstream backend_pool`, round robin) y envía `/media` a `minio:9000` conservando el nombre del bucket. Requiere la red y los servicios de Compose. WebSocket usa HTTP/1.1, cabeceras de upgrade y un timeout de una hora; los logs de acceso omiten la query y el Referer, y se descartan los errores de `/ws` porque pueden incluir el token.

### Publicaciones y feed

El formulario de `/feed` envía `texto` y el `archivo` opcional mediante `multipart/form-data` a `POST /api/posts`. El navegador genera el boundary; el cliente compartido adjunta el JWT. Se admiten entre 1 y 5000 caracteres y PNG, JPEG o GIF de hasta 5 MiB. El servidor verifica el contenido y el límite de 20 megapíxeles. La vista previa se libera al quitar o reemplazar la imagen. Si falla la solicitud se conserva el borrador; una creación confirmada ofrece un enlace al detalle.

Quarkus guarda el texto y la clave del objeto en Neo4j y el archivo en MinIO. Las tarjetas cargan las imágenes mediante `/media/<clave>` del mismo origen, a través de Vite o Nginx. No se almacenan binarios en el grafo ni se envían credenciales de MinIO al navegador.

`GET /api/feed?page=0` y `GET /api/usuarios/{id}/posts?page=0` devuelven arrays de hasta 20 elementos; menos de 20 indica el final. **Cargar más publicaciones** agrega páginas y elimina duplicados por id. Un fallo mantiene las tarjetas existentes y permite repetir la página pendiente. Tras publicar o seguir a alguien, Inicio vuelve a consultar la primera página. El feed solo contiene publicaciones de personas seguidas: las publicaciones propias se consultan en el perfil o desde el enlace de confirmación.

`GET /api/posts/{id}` alimenta el detalle, incluido el destino de Web Push. El contador se muestra cuando la respuesta contiene `reacciones`; el contrato actual del detalle y de los perfiles no incluye ese campo, por lo que no se inventa un cero.

Las pruebas de publicaciones comprueban creación con imagen, reintentos, límites, paginación, detalle, perfiles y vista móvil. La aplicación consume siempre el feed real; no existe un modo con publicaciones ficticias.

## Reacciones

Las tarjetas del feed usan `reaccionado` y `reacciones` como estado inicial. **Me gusta** llama a `POST /api/posts/{id}/reacciones`; quitarlo llama a `DELETE` en la misma ruta. El botón queda bloqueado durante la petición y actualiza estado y contador únicamente después de recibir `204`. Si falla, conserva el estado anterior y muestra un error recuperable.

## Propuesta de la pantalla principal

La estructura de Inicio y el menú de cuenta están descritos en [la propuesta de diseño](proposals/pantalla-principal.md), con los contratos reutilizados y las decisiones pendientes de revisión. Siguiendo abre Inicio y conserva el feed real paginado; Para ti usa Descubrir desde una sola entrada visible. Amigos muestra seguimientos mutuos, búsqueda y sugerencias.
