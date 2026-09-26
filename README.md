# Red Social Distribuida

Proyecto de la asignatura **Sistemas Distribuidos y Cloud Computing**.

Aplicación web distribuida que implementa las funcionalidades esenciales de una red social, integrando comunicación REST, WebSocket y Web Push, persistencia en una base de datos de grafos y almacenamiento de objetos compatible con S3.

## Integrantes

- Jose
- Luis
- Dayron

## Stack

| Componente | Tecnología |
|---|---|
| Frontend | React |
| Backend | Quarkus + Java |
| Base de datos de grafos | Neo4j |
| Almacenamiento de archivos | Object Storage compatible con S3 |
| Tiempo real | WebSocket |
| Notificaciones | Web Push |
| Despliegue | Docker Compose |

## Arquitectura

El navegador habla con un único punto de entrada (Nginx). Nginx sirve la SPA, reparte las peticiones entre dos instancias del backend y expone las imágenes de MinIO.
Las instancias persisten en Neo4j, guardan archivos en MinIO, se coordinan por Redis para el chat y envían notificaciones a través del servicio push del navegador.

```mermaid
flowchart LR
    subgraph NavApp["Navegador: pestaña de la app"]
        R["React SPA"]
    end

    subgraph NavBg["Navegador: segundo plano"]
        SW["Service Worker"]
    end

    CF["Cloudflare<br/>URL pública HTTPS"]
    PS["Servicio push del navegador<br/>FCM / Mozilla"]

    subgraph Compose["Docker Compose"]
        T["cloudflared<br/>túnel"]
        N["Nginx :8080<br/>punto de entrada único<br/>+ balanceo"]
        Q1["Quarkus<br/>backend-1"]
        Q2["Quarkus<br/>backend-2"]
        RD[("Redis<br/>pub/sub")]
        DB[("Neo4j")]
        S3[("MinIO<br/>S3")]
    end

    R -- "HTTP GET / (SPA)" --> N
    R -- "REST /api" --> N
    R <-- "WebSocket /ws/chat" --> N
    R -- "HTTP GET /media (imágenes)" --> N
    R -. "HTTPS (clientes remotos)" .-> CF
    CF <-. "túnel (conexión saliente)" .-> T
    T -. "HTTP" .-> N
    N -- "REST + WebSocket<br/>(balanceo)" --> Q1
    N -- "REST + WebSocket<br/>(balanceo)" --> Q2
    N -- "proxy /media<br/>(HTTP GET)" --> S3
    Q1 <-- "Pub/Sub (chat)" --> RD
    Q2 <-- "Pub/Sub (chat)" --> RD
    Q1 -- "Cypher (Bolt)" --> DB
    Q2 -- "Cypher (Bolt)" --> DB
    Q1 -- "S3 API" --> S3
    Q2 -- "S3 API" --> S3
    Q1 -- "Web Push (VAPID)" --> PS
    Q2 -- "Web Push (VAPID)" --> PS
    PS -- "push" --> SW
```

- React SPA y Service Worker corren en el mismo navegador. Se dibujan separados porque el Service Worker sigue activo en segundo plano y recibe las notificaciones aunque la pestaña de la app esté cerrada.
- Las líneas punteadas muestran el camino de los clientes remotos: llevan el mismo tráfico (SPA, REST, WebSocket, imágenes) que un cliente local, pero entran por el túnel HTTPS.

### Qué viaja por cada canal

| Origen → Destino | Mecanismo | Qué transporta | Por qué este mecanismo |
|---|---|---|---|
| React → Quarkus (vía Nginx) | REST/HTTP | CRUD, feed, seguir, reacciones, historial del chat | Operaciones puntuales de pedido/respuesta, sin estado de conexión |
| React ↔ Quarkus (vía Nginx) | WebSocket | Mensajes de chat en tiempo real | Conexión persistente y bidireccional: el servidor envía sin que el cliente pregunte |
| Quarkus → Servicio push → Service Worker | Web Push | Aviso de nueva publicación | Llega aunque la app esté cerrada; el canal lo mantiene el navegador, no la aplicación |
| Quarkus → Neo4j | Bolt + Cypher | Usuarios, relaciones, posts, mensajes, suscripciones push | Los datos son relaciones: seguir, publicar, reaccionar |
| Quarkus → MinIO | S3 API | Archivos binarios (imágenes) | Los binarios no pertenecen a una base de datos |
| Navegador → MinIO (vía Nginx) | HTTP GET | Descarga de imágenes | El backend no tiene que retransmitir cada imagen |
| Quarkus ↔ Redis | Pub/Sub | Mensajes de chat entre instancias | Cada instancia solo conoce sus propias conexiones WebSocket; el broker las comunica |
| Cliente remoto → Cloudflare → `cloudflared` → Nginx | Túnel HTTPS | Todo el tráfico de la aplicación | Da un contexto seguro (HTTPS), requisito de Service Worker y Web Push, sin abrir puertos |
