# Backend

API REST, WebSocket y Web Push de la red social. Quarkus 3.33 (LTS), Java 21 y Maven Wrapper.

## Requisitos

- Java 21 para ejecutar `./mvnw` localmente, o solo Docker (ver [Sin Java instalado](#sin-java-instalado)).
- Docker para las pruebas: levantan Neo4j y Redis temporales con Dev Services (Testcontainers).

## Modo desarrollo

Levantar la infraestructura desde la raíz del repositorio y luego Quarkus con recarga automática:

```bash
docker compose up neo4j redis minio minio-init
./mvnw quarkus:dev
```

- API: `http://localhost:8080/api`
- Swagger UI: `http://localhost:8080/api/docs`
- Salud: `http://localhost:8080/q/health`

## Pruebas

```bash
./mvnw verify
```

## Imagen Docker

```bash
docker build -t red-social-backend .
```

El build es multi-stage (Maven con JDK 21 → JRE 21) y genera el layout *fast-jar* de Quarkus.

### Sin Java instalado

```bash
docker run --rm -v "$(pwd):/app" -v rsd-m2:/root/.m2 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal \
  -w /app maven:3.9-eclipse-temurin-21 mvn -B verify
```

`TESTCONTAINERS_HOST_OVERRIDE` es necesario en Docker Desktop para que las pruebas alcancen los contenedores de Dev Services.
Se usa `mvn` de la imagen y no `./mvnw`: la imagen no incluye `unzip` y el wrapper no puede validar la descarga de Maven.

## Variables de entorno

| Variable | Valor por defecto | Uso |
|---|---|---|
| `INSTANCE_ID` | `local` | Identifica la instancia en `GET /api/info` y en los logs |
| `NEO4J_URI` | `bolt://localhost:7687` | Conexión Bolt a Neo4j |
| `NEO4J_USER` | `neo4j` | Usuario de Neo4j |
| `NEO4J_PASSWORD` | `devpassword` | Contraseña de Neo4j |
| `REDIS_HOST` | `localhost` | Host de Redis (pub/sub del chat) |
| `REDIS_PORT` | `6379` | Puerto de Redis |
| `MINIO_ENDPOINT` | `http://localhost:9000` | Endpoint S3 de MinIO |
| `MINIO_ACCESS_KEY` | `minioadmin` | Credencial de acceso a MinIO |
| `MINIO_SECRET_KEY` | `minioadmin` | Credencial secreta de MinIO |
| `MINIO_BUCKET` | `media` | Bucket de archivos |

En las pruebas, Neo4j y Redis no usan estas variables: Dev Services levanta contenedores temporales.

## Convenciones

- **Estructura por funcionalidad** en `com.redsocial`: `auth`, `usuarios`, `social`, `posts`, `feed`, `media`, `chat`,
  `notificaciones` y `shared`. Cada paquete contiene su recurso REST, servicio y repositorio Cypher.
- **Seguridad:** los endpoints privados se anotan con `@Authenticated` y exigen un JWT válido.
  Sin token o con un token inválido responden `401`.
- **Errores:** toda respuesta de error tiene el formato `{ "error": "CODIGO", "mensaje": "Texto para el usuario" }`.
  El código de negocio lanza `ApiException` (por ejemplo `ApiException.notFound("USUARIO_NO_ENCONTRADO", "El usuario no existe")`).
- **Constraints de Neo4j:** se crean al iniciar con `IF NOT EXISTS`, así que varias instancias pueden arrancar a la vez.
