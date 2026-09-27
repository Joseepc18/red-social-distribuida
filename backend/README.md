# Backend

API REST, WebSocket y Web Push de la red social. Quarkus 3.33 (LTS), Java 21 y Maven Wrapper.

## Requisitos

- Java 21 para ejecutar `./mvnw` localmente, o solo Docker (ver [Sin Java instalado](#sin-java-instalado)).
- Docker para las pruebas: levantan Neo4j y Redis temporales con Dev Services (Testcontainers).

## Modo desarrollo

Preparar el `.env` de la raíz según el [README principal](../README.md#puesta-en-marcha-para-el-equipo). Cada integrante levanta sus propios servicios en su computadora.

Desde la raíz, iniciar la infraestructura con los puertos locales necesarios para Quarkus:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build neo4j redis minio minio-init
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps -a
```

Esperar a que Neo4j, Redis y MinIO estén `healthy` y `minio-init` termine con código `0`. El archivo adicional publica Redis y la API de MinIO solo en `127.0.0.1`; no permite conexiones desde otras computadoras.

Crear `backend/.env` (ignorado por Git) con estos campos, reemplazando los tres valores entre `<...>` por los de tu `.env` de la raíz:

```dotenv
NEO4J_PASSWORD=<valor de NEO4J_PASSWORD>
MINIO_ACCESS_KEY=<valor de MINIO_ROOT_USER>
MINIO_SECRET_KEY=<valor de MINIO_ROOT_PASSWORD>
NEO4J_URI=bolt://localhost:7687
REDIS_HOST=localhost
REDIS_PORT=6379
MINIO_ENDPOINT=http://localhost:9000
```

Si cambiaste `NEO4J_BOLT_PORT`, `REDIS_PORT` o `MINIO_API_PORT` en la raíz, usar esos mismos puertos en las direcciones anteriores. Mantener las credenciales sincronizadas si las cambias. Quarkus [lee el `.env` del directorio actual](https://quarkus.io/guides/config-reference/#env-file-in-the-current-working-directory); las variables ya definidas en la terminal o el IDE tienen prioridad.

Después, ejecutar desde `backend/` con Java 21:

```bash
cd backend
./mvnw quarkus:dev
```

En PowerShell, usar `.\mvnw.cmd quarkus:dev` en lugar de `./mvnw`.

- API: `http://localhost:8080/api`
- Swagger UI: `http://localhost:8080/api/docs`
- Salud: `http://localhost:8080/q/health`

En modo desarrollo y en las pruebas no hace falta configurar claves JWT: Quarkus genera un par de claves RSA al iniciar.
Los tokens emitidos dejan de ser válidos cada vez que la aplicación se reinicia.

Para detener la infraestructura conservando los datos, ejecutar desde la raíz: `docker compose -f docker-compose.yml -f docker-compose.dev.yml down`.

## Pruebas

```bash
./mvnw verify
```

## Imagen Docker

```bash
docker build -t red-social-backend .
```

El build es multi-stage (Maven con JDK 21 → JRE 21) y genera el layout *fast-jar* de Quarkus.

### Claves JWT para Docker

En producción el backend lee el par de claves desde archivos montados en el contenedor. Desde `backend/`, se generan una sola vez
y **nunca se versionan** (`*.pem` y `keys/` están en `.gitignore`):

```bash
mkdir -p keys
[ ! -e keys/privateKey.pem ] && [ ! -e keys/publicKey.pem ] || { echo 'Ya existen claves; conservarlas.'; exit 1; }
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out keys/privateKey.pem
openssl pkey -in keys/privateKey.pem -pubout -out keys/publicKey.pem
```

Alternativa en PowerShell 7, también desde `backend/` (sin instalar OpenSSL):

```powershell
New-Item -ItemType Directory -Force keys | Out-Null
if ((Test-Path keys/privateKey.pem) -or (Test-Path keys/publicKey.pem)) { throw 'Ya existen claves; conservarlas.' }
$rsa = [System.Security.Cryptography.RSA]::Create(2048)
try {
    [IO.File]::WriteAllText((Join-Path $PWD 'keys/privateKey.pem'), $rsa.ExportPkcs8PrivateKeyPem())
    [IO.File]::WriteAllText((Join-Path $PWD 'keys/publicKey.pem'), $rsa.ExportSubjectPublicKeyInfoPem())
} finally { $rsa.Dispose() }
```

Compose monta `./backend/keys:/keys:ro`; el usuario del backend (UID 185) necesita permiso de lectura. No regenerar las claves en cada arranque: invalidaría los tokens existentes. Cuando se agregue otra instancia, ambas deberán usar el mismo par.

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
| `MEDIA_PUBLIC_URL` | `/media/` | Prefijo público de las imágenes; se concatena con la clave del objeto |
| `JWT_ISSUER` | `red-social` | Emisor (`iss`) de los tokens, validado al recibirlos |
| `JWT_LIFESPAN_SECONDS` | `86400` | Vigencia de los tokens emitidos (24 h) |
| `JWT_PUBLIC_KEY_LOCATION` | `file:/keys/publicKey.pem` | Clave pública para verificar tokens (solo producción) |
| `JWT_PRIVATE_KEY_LOCATION` | `file:/keys/privateKey.pem` | Clave privada para firmar tokens (solo producción) |
| `VAPID_PUBLIC_KEY` | (vacío) | Clave pública VAPID de Web Push; sin ella `GET /api/push/clave-publica` responde `503` |
| `VAPID_PRIVATE_KEY` | (vacío) | Clave privada VAPID con la que se firman las notificaciones |
| `VAPID_SUBJECT` | (vacío) | Contacto del servidor para los servicios push (`mailto:...`) |

En las pruebas, Neo4j y Redis no usan estas variables: Dev Services levanta contenedores temporales.

## Publicaciones (#9 y #10)

El [contrato de publicaciones y del evento](../README.md#contrato-interno-postcreated-issues-9-y-10) está en el README principal. Ejemplo con un JWT de login, desde Bash:

```bash
curl -H "Authorization: Bearer $TOKEN" -F 'texto=Mi primera publicación' -F 'archivo=@foto.png;type=image/png' http://localhost:8080/api/posts
```

Omitir `archivo` para publicar solo texto. Quarkus acepta hasta 6 MiB por petición (incluido el formulario), mientras el servicio limita cada imagen a 5 MiB. El archivo temporal se elimina al terminar la petición. Para probar mediante un proxy, configurar también allí el límite de 6 MiB.

`./mvnw verify` comprueba creación/consulta, paginación, permisos, validación de archivos, fallos de almacenamiento y emisión asíncrona después del commit. Estas pruebas usan Neo4j y Redis temporales y una implementación de `MediaStorage` en memoria; la integración S3 se verifica aparte con MinIO real.

## Convenciones

- **Estructura por funcionalidad** en `com.redsocial`: `auth`, `usuarios`, `social`, `posts`, `feed`, `media`, `chat`,
  `notificaciones` y `shared`. Cada paquete contiene su recurso REST, servicio y repositorio Cypher.
- **Seguridad:** los endpoints privados se anotan con `@Authenticated` y exigen un JWT válido.
  Sin token o con un token inválido responden `401`.
- **Errores:** toda respuesta de error tiene el formato `{ "error": "CODIGO", "mensaje": "Texto para el usuario" }`.
  El código de negocio lanza `ApiException` (por ejemplo `ApiException.notFound("USUARIO_NO_ENCONTRADO", "El usuario no existe")`).
- **Constraints de Neo4j:** se crean al iniciar con `IF NOT EXISTS`, así que varias instancias pueden arrancar a la vez.
