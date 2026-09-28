// Issue #60: consultas de solo lectura para Neo4j Browser (evidencias 4 y 11).
// Preparación: ejecutar scripts/seed-demo.mjs; conectarse a la base neo4j.
// Ejecutar cada :param por separado y luego la consulta que lo sigue.
// Los UUID se buscan por username: cambian cada vez que se recrea la base.

// C1. Feed: publicaciones de bruno y carla, los usuarios que sigue ana.
:param userId => head(COLLECT { MATCH (u:Usuario {username: 'ana'}) RETURN u.id });
:param skip => 0;
:param limit => 20;

MATCH (yo:Usuario {id: $userId})-[:SIGUE]->(autor:Usuario)-[:PUBLICA]->(p:Post)
WITH yo, p, autor
ORDER BY p.fecha DESC
SKIP $skip LIMIT $limit
RETURN p.id AS id, p.texto AS texto, p.fecha AS fecha, p.mediaKey AS mediaKey,
       autor.id AS autorId, autor.username AS autorUsername,
       COUNT { (p)<-[:REACCIONA]-() } AS reacciones,
       EXISTS { (yo)-[:REACCIONA]->(p) } AS reaccionado;

// C2. Recomendaciones: amigos de amigos que ana aún no sigue.
// diego tiene dos conexiones en común; elena y fabian tienen una.
:param userId => head(COLLECT { MATCH (u:Usuario {username: 'ana'}) RETURN u.id });

MATCH (yo:Usuario {id: $userId})-[:SIGUE]->(intermedio:Usuario)-[:SIGUE]->(sug:Usuario)
WHERE sug <> yo AND NOT (yo)-[:SIGUE]->(sug)
WITH sug,
     count(DISTINCT intermedio) AS enComun,
     collect(DISTINCT intermedio.username)[..3] AS conexiones
WITH sug, enComun, conexiones, COUNT { (sug)<-[:SIGUE]-() } AS seguidores
ORDER BY enComun DESC, seguidores DESC
LIMIT 10
RETURN sug.id AS id, sug.username AS username, sug.nombre AS nombre,
       enComun, conexiones, seguidores;

// C2 (arranque en frío). Recomienda por seguidores a julian, que no sigue a nadie.
:param userId => head(COLLECT { MATCH (u:Usuario {username: 'julian'}) RETURN u.id });

MATCH (yo:Usuario {id: $userId}), (sug:Usuario)
WHERE sug <> yo AND NOT (yo)-[:SIGUE]->(sug)
WITH sug, COUNT { (sug)<-[:SIGUE]-() } AS seguidores
ORDER BY seguidores DESC
LIMIT 10
RETURN sug.id AS id, sug.username AS username, sug.nombre AS nombre,
       0 AS enComun, [] AS conexiones, seguidores;

// C3. Seguidos en común: ana y fabian siguen a bruno y carla.
:param userA => head(COLLECT { MATCH (u:Usuario {username: 'ana'}) RETURN u.id });
:param userB => head(COLLECT { MATCH (u:Usuario {username: 'fabian'}) RETURN u.id });

MATCH (a:Usuario {id: $userA})-[:SIGUE]->(comun:Usuario)<-[:SIGUE]-(b:Usuario {id: $userB})
RETURN comun.id AS id, comun.username AS username, comun.nombre AS nombre
ORDER BY username;

// C4. Alcance: usuarios a uno, dos o tres saltos desde ana (irene queda fuera).
:param userId => head(COLLECT { MATCH (u:Usuario {username: 'ana'}) RETURN u.id });

MATCH camino = (yo:Usuario {id: $userId})-[:SIGUE*1..3]->(u:Usuario)
WHERE u <> yo
WITH u, min(length(camino)) AS distancia
RETURN u.id AS id, u.username AS username, u.nombre AS nombre, distancia
ORDER BY distancia, username;

// C5. Separación: camino más corto, sin dirección, entre ana e irene (4 grados).
:param userA => head(COLLECT { MATCH (u:Usuario {username: 'ana'}) RETURN u.id });
:param userB => head(COLLECT { MATCH (u:Usuario {username: 'irene'}) RETURN u.id });

MATCH (a:Usuario {id: $userA}), (b:Usuario {id: $userB})
MATCH camino = shortestPath((a)-[:SIGUE*..6]-(b))
RETURN [n IN nodes(camino) | n.username] AS cadena, length(camino) AS grados;

// C6. Web Push: suscripciones de quienes siguen a bruno, para avisar de su post.
// El seed no crea suscripciones: sin activar notificaciones, devuelve cero filas.
// Para ver un resultado real, entrar como ana y activar notificaciones por HTTPS
// o localhost antes de ejecutar. No compartir los campos endpoint, p256dh y auth.
:param autorId => head(COLLECT { MATCH (u:Usuario {username: 'bruno'}) RETURN u.id });

MATCH (autor:Usuario {id: $autorId})<-[:SIGUE]-(seg:Usuario)-[:TIENE_SUSCRIPCION]->(s:SuscripcionPush)
RETURN seg.id AS usuarioId, s.endpoint AS endpoint, s.p256dh AS p256dh, s.auth AS auth;

// C7. Descubrir: posts de autores que ana no sigue, reaccionados por su red.
// El post con imagen de diego aparece con dos amigosQueReaccionaron.
:param userId => head(COLLECT { MATCH (u:Usuario {username: 'ana'}) RETURN u.id });

MATCH (yo:Usuario {id: $userId})-[:SIGUE]->(amigo:Usuario)-[:REACCIONA]->(p:Post)<-[:PUBLICA]-(autor:Usuario)
WHERE autor <> yo AND NOT (yo)-[:SIGUE]->(autor)
WITH p, autor, count(DISTINCT amigo) AS amigosQueReaccionaron
ORDER BY amigosQueReaccionaron DESC, p.fecha DESC, p.id DESC
LIMIT 10
RETURN p.id AS id, p.texto AS texto, toString(p.fecha) AS fecha,
       p.mediaKey AS mediaKey, p.mediaTipo AS mediaTipo,
       autor.id AS autorId, autor.username AS username, autor.nombre AS nombre,
       amigosQueReaccionaron
ORDER BY amigosQueReaccionaron DESC, p.fecha DESC, p.id DESC;

// Grafo de demostración: usuarios (también julian, aislado), seguimientos,
// publicaciones y reacciones. Seleccionar Graph en Neo4j Browser.
// Esta vista administrativa devuelve nodos completos de los usuarios demo;
// sus propiedades incluyen passwordHash. C1-C7 mantienen los campos del README.
:param demoUsernames => ['ana', 'bruno', 'carla', 'diego', 'elena', 'fabian', 'gabriela', 'hector', 'irene', 'julian'];

MATCH (u:Usuario)
WHERE u.username IN $demoUsernames
OPTIONAL MATCH (u)-[r:SIGUE|PUBLICA|REACCIONA]->(destino)
WHERE (destino:Usuario AND destino.username IN $demoUsernames)
   OR (destino:Post AND EXISTS {
       MATCH (autor:Usuario)-[:PUBLICA]->(destino)
       WHERE autor.username IN $demoUsernames
   })
RETURN u, r, destino;
