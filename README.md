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

## Infraestructura base (issue #4)

Se configuró Docker Compose con Neo4j, MinIO y Redis, una red compartida, comprobaciones de salud y creación automática del bucket `media`.

### Puesta en marcha para el equipo

Después de clonar el repositorio, abrir Docker Desktop con contenedores Linux y copiar la plantilla desde la carpeta raíz del proyecto:

```powershell
Copy-Item .env.example .env
```

La copia de `.env` se hace solo la primera vez; si ya existe, conservar sus valores. En Linux o macOS se puede usar `cp .env.example .env`. El archivo `.env` contiene la configuración local y no se sube a Git.

La plantilla incluye valores predeterminados de desarrollo, compartidos con el equipo. Antes del primer arranque, sustituir las contraseñas de `NEO4J_PASSWORD` y `MINIO_ROOT_PASSWORD` en `.env` por contraseñas propias de al menos 8 caracteres. El usuario de MinIO (`MINIO_ROOT_USER`) debe tener al menos 3 caracteres. Compose exige credenciales no vacías; las variables VAPID se mantienen vacías hasta integrar Web Push.

Con la configuración completa, ejecutar:

```sh
docker compose up -d --build
docker compose ps -a
```

Si Neo4j ya tiene datos, editar `.env` no cambia su contraseña: primero debe actualizarse dentro de la base existente.

El primer arranque requiere internet y tarda más porque descarga dependencias y compila MinIO automáticamente. No hace falta instalar Go ni MinIO en la laptop. Las siguientes ejecuciones reutilizan las imágenes construidas.

Esperar a que Neo4j, MinIO y Redis aparezcan como `healthy`. El servicio `minio-init` debe mostrar `Exited (0)`: significa que creó o verificó el bucket y terminó correctamente.

| Acceso | Inicio de sesión |
|---|---|
| [Neo4j Browser](http://localhost:7474) | Conexión `bolt://localhost:7687`, usuario `neo4j` y valor de `NEO4J_PASSWORD` en `.env` |
| [Consola MinIO](http://localhost:9001) | Valores de `MINIO_ROOT_USER` y `MINIO_ROOT_PASSWORD` en `.env` |

En MinIO debe aparecer el bucket `media`. Redis funciona internamente y no tiene consola web. Si los puertos `7474`, `7687` o `9001` están ocupados, cambiar sus variables en `.env` y ajustar las direcciones de acceso.

Para revisar un fallo de arranque: `docker compose logs --tail=50`. Para detener el entorno conservando los datos: `docker compose down`.

### Decisiones técnicas

- Neo4j y MinIO conservan datos en volúmenes; Redis funciona solo en memoria para Pub/Sub.
- El bucket `media` permite lectura pública y requiere autenticación para escribir.
- MinIO y `mc` se construyen desde revisiones fijas del código oficial, debido a la indisponibilidad de las imágenes previstas. Así todos usan las mismas fuentes.
