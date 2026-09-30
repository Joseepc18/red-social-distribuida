# Propuesta de diseño de la pantalla principal

Propuesta de Luis para revisión en el issue #67. El alcance visual de esta iteración es Inicio y su navegación compartida. Las demás pantallas recibirán sus propias propuestas posteriormente.

## Experiencia propuesta

- Navegación lateral sobre el mismo fondo de la página, sin panel ni separación vertical: Inicio, Amigos, Descubrir, Mensajes y Nueva publicación.
- Inicio presenta Para ti y Siguiendo en la franja superior. El compositor de texto e imagen está debajo, con las validaciones y confirmación de publicación existentes.
- A quién seguir ocupa la columna derecha en escritorio: máximo tres recomendaciones reales, botón Seguir y Mostrar más. En móvil aparece después de las publicaciones.
- El avatar superior abre Perfil, Configuración, cambio de tema y Cerrar sesión. Se retiran la búsqueda superior y la cuenta inferior izquierda. La búsqueda de personas permanece en Amigos.
- El perfil usa las iniciales que admite el contrato actual; esta propuesta no incluye carga de fotografía de perfil.
- Configuración reúne apariencia y Web Push. La preferencia de tema es local al navegador. El permiso de notificaciones sigue solicitándose solo mediante su botón explícito.

## Significado de las secciones y contratos reutilizados

| Elemento | Comportamiento y origen real |
|---|---|
| Para ti | Reutiliza `GET /api/descubrir`: publicaciones recomendadas por reacciones de personas seguidas. Conserva la explicación de quiénes las recomendaron y el estado vacío; no agrega un algoritmo nuevo. |
| Siguiendo | Reutiliza `GET /api/feed?page=`: publicaciones de personas seguidas, con paginación y reacciones. |
| A quién seguir | Reutiliza las sugerencias del grafo y la operación de seguimiento existentes. Seguir actualiza las sugerencias y el contenido de Inicio. |
| Amigos | Son seguimientos mutuos: intersección por id de `GET /api/usuarios/{id}/seguidores` y `/seguidos`. No existen solicitudes de amistad ni aceptación. La búsqueda y las recomendaciones se conservan. |
| Perfil | Abre la edición existente de nombre y biografía mediante `PUT /api/usuarios/me`. |
| Tema | Alterna claro/oscuro y guarda `nodouni.theme` en localStorage. No se sincroniza entre dispositivos. |
| Notificaciones | Reutiliza el Service Worker y los endpoints de Web Push existentes. La revisión de la suscripción permanece activa en el layout aunque su control esté en Configuración. |

## Flujo del chat

1. Al entrar en una ruta privada, AppLayout monta un ChatProvider asociado al token de la sesión. Abre una conexión a `/ws/chat?token=<JWT>` y consulta las conversaciones por REST.
2. La conexión permanece al navegar entre pantallas. Un mensaje recibido actualiza el historial por id; si pertenece a una conversación desconocida, vuelve a consultar la lista. No usa polling.
3. La burbuja inferior derecha permite consultar conversaciones sin abandonar Inicio. En escritorio se abre una conversación flotante a la vez; puede minimizarse o abrirse en `/chat`.
4. En móvil, la burbuja dirige a `/chat`. La lista y la conversación ocupan la vista disponible, con control para regresar. Mensajes en la navegación abre siempre la vista completa.
5. Los mensajes se envían por WebSocket. El historial y los mensajes anteriores se recuperan con `GET /api/conversaciones/{id}/mensajes` y el cursor `antes` existente. Los mensajes repetidos se combinan por id.
6. Al perder conexión se conserva el estado local, se deshabilita el envío y se reconecta con espera exponencial de 1 a 30 segundos. Tras reconectar se recargan las conversaciones y los historiales consultados.
7. Los borradores permanecen al alternar vistas durante la sesión. Cerrar sesión o cambiar de cuenta desmonta el proveedor, cierra el socket, cancela peticiones y descarta los mensajes, borradores y contadores locales.

El indicador de mensajes nuevos cuenta eventos recibidos mientras esa conversación no está visible o la pestaña no tiene foco. Se borra al abrirla con la pestaña enfocada. Es una ayuda de la sesión actual: no reconstruye mensajes no leídos anteriores, no se mantiene al recargar y no se sincroniza con otros dispositivos.

## Coordinación con backend

**Esta propuesta no necesita endpoints, entidades, relaciones ni lógica de backend nuevos.** Todos los controles operativos reutilizan capacidades ya integradas. La incorporación de amigos por seguimiento mutuo y el uso de Descubrir como Para ti son decisiones de presentación que José debe revisar antes de integrar.

Si después se solicitan solicitudes de amistad, recomendaciones con otra lógica, fotografía de perfil o contadores de lectura persistentes, se deberá elaborar una especificación independiente con sus reglas de negocio, flujo, permisos, datos y contratos. Esas capacidades no están implementadas ni simuladas en esta propuesta.

## Revisión local

Con el stack de Docker existente disponible, ejecutar desde `frontend`:

```powershell
$env:BACKEND_PROXY_TARGET = 'http://localhost:8080'
$env:MEDIA_PROXY_TARGET = 'http://localhost:8080'
npm run dev -- --host 127.0.0.1 --port 5173
```

Abrir `http://127.0.0.1:5173`. Ambos destinos apuntan a Nginx, que reenvía API, WebSocket e imágenes. Se pueden sustituir por el puerto de otro entorno local sin modificar el código.

Revisar Inicio en ambos temas, las dos pestañas, el compositor, el menú de cuenta y la burbuja. Con dos usuarios, enviar un primer mensaje mientras el receptor está en Inicio, responder desde la ventana y continuar desde `/chat`. Revisar también a 390 px de ancho y al recargar el tema elegido.

Las capturas adjuntas utilizan cuentas del entorno de demostración. Los resultados fechados de validación están en el issue, no en esta guía permanente.
