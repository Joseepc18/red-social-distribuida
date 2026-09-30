# Propuesta de diseño de la pantalla principal

Propuesta de Luis iniciada en el issue #67 y refinada después del PR #68. El alcance visual de esta iteración es Inicio y su navegación compartida. Las demás pantallas recibirán sus propias propuestas posteriormente.

## Experiencia propuesta

- Navegación lateral sobre el mismo fondo de la página, sin panel ni separación vertical: Inicio, Amigos, Mensajes y Nueva publicación. Para ti queda en Inicio; no duplica la entrada Descubrir.
- Inicio abre en Siguiendo, el feed real de personas seguidas. Para ti ocupa la segunda pestaña y conserva las recomendaciones existentes. El compositor de texto e imagen está debajo, con las validaciones y confirmación de publicación actuales.
- La navegación lateral aprovecha el borde izquierdo de la pantalla y deja más espacio entre el menú y el feed. Las pestañas de Inicio son compactas; el compositor empieza bajo y crece conforme se escribe. Publicar o seguir a alguien actualiza el feed sin un botón manual.
- La paleta usa fondos claros limpios y un fondo oscuro ciruela grafito, con violeta como acento de NodoUni. El menú de cuenta conserva Perfil, Configuración y Cerrar sesión; el tema se cambia desde Configuración.
- A quién seguir ocupa la columna derecha en escritorio: máximo tres recomendaciones reales, botón Seguir y Mostrar más. En móvil aparece después de las publicaciones.
- El avatar superior abre Perfil, Configuración y Cerrar sesión. Se retiran la búsqueda superior y la cuenta inferior izquierda. La búsqueda de personas permanece en Amigos.
- El perfil usa las iniciales que admite el contrato actual; esta propuesta no incluye carga de fotografía de perfil.
- Configuración reúne apariencia y Web Push. La preferencia de tema es local al navegador. El permiso de notificaciones sigue solicitándose solo mediante su botón explícito.

## Significado de las secciones y contratos reutilizados

| Elemento | Comportamiento y origen real |
|---|---|
| Siguiendo | Es la primera vista de Inicio y reutiliza `GET /api/feed?page=`: publicaciones de personas seguidas, con paginación y reacciones. |
| Para ti | Es la segunda pestaña y reutiliza `GET /api/descubrir`: publicaciones recomendadas por reacciones de personas seguidas. Conserva la explicación de quiénes las recomendaron y el estado vacío; no agrega un algoritmo nuevo. `/descubrir` redirige a esta pestaña para evitar dos entradas visibles al mismo contenido. |
| A quién seguir | Reutiliza las sugerencias del grafo y la operación de seguimiento existentes. Seguir actualiza las sugerencias y el contenido de Inicio. |
| Amigos | Por ahora muestra seguimientos mutuos al cruzar por id `GET /api/usuarios/{id}/seguidores` y `/seguidos` en el frontend. No existen solicitudes de amistad ni aceptación. Si se conserva esta sección, la consulta de mutuos debe trasladarse al grafo mediante un issue de backend; la búsqueda y las recomendaciones actuales se conservan. |
| Perfil | Abre la edición existente de nombre y biografía mediante `PUT /api/usuarios/me`. |
| Tema | Alterna claro/oscuro y guarda `nodouni.theme` en localStorage. No se sincroniza entre dispositivos. |
| Notificaciones | Reutiliza el Service Worker y los endpoints de Web Push existentes. La revisión de la suscripción permanece activa en el layout aunque su control esté en Configuración. |

## Coordinación con backend

**Esta propuesta no necesita endpoints, entidades, relaciones ni lógica de backend nuevos.** Todos los controles operativos reutilizan capacidades ya integradas. La incorporación de amigos por seguimiento mutuo y el uso de Descubrir como Para ti son decisiones de presentación que José debe revisar antes de integrar. El chat global se revisa por separado en el [issue #70](https://github.com/Joseepc18/red-social-distribuida/issues/70) y el [PR #71](https://github.com/Joseepc18/red-social-distribuida/pull/71).

Si después se solicitan solicitudes de amistad, recomendaciones con otra lógica, fotografía de perfil o contadores de lectura persistentes, se deberá elaborar una especificación independiente con sus reglas de negocio, flujo, permisos, datos y contratos. Esas capacidades no están implementadas ni simuladas en esta propuesta.

## Revisión local

Con el stack de Docker existente disponible, ejecutar desde `frontend`:

```powershell
$env:BACKEND_PROXY_TARGET = 'http://localhost:8080'
$env:MEDIA_PROXY_TARGET = 'http://localhost:8080'
npm run dev -- --host 127.0.0.1 --port 5173
```

Abrir `http://127.0.0.1:5173`. Ambos destinos apuntan a Nginx, que reenvía API, WebSocket e imágenes. Se pueden sustituir por el puerto de otro entorno local sin modificar el código.

Revisar Inicio en ambos temas, las dos pestañas, el compositor y el menú de cuenta. Revisar también a 390 px de ancho y al recargar el tema elegido.

La revisión usa cuentas del entorno local de demostración. Los resultados fechados de validación se registran en la descripción del PR correspondiente, no en esta guía permanente.
