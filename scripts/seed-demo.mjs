#!/usr/bin/env node
// Seeds a demo social network through the public REST API only: it never writes to
// Neo4j or MinIO directly, so every node, relationship and image goes through the
// same validation, security and storage flow as a real user.
//
// Usage: node scripts/seed-demo.mjs [baseUrl]
// Base URL: first argument, then SEED_BASE_URL, then http://localhost:8080.
// Requires Node.js 18+ (built-in fetch, FormData and Blob).

import { deflateSync } from 'node:zlib';

const BASE_URL = (process.argv[2] ?? process.env.SEED_BASE_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
const PASSWORD = 'Demo2026!';

const USERS = [
  ['ana', 'Ana Torres'],
  ['bruno', 'Bruno Díaz'],
  ['carla', 'Carla Méndez'],
  ['diego', 'Diego Ramos'],
  ['elena', 'Elena Vargas'],
  ['fabian', 'Fabián Ruiz'],
  ['gabriela', 'Gabriela Soto'],
  ['hector', 'Héctor Luna'],
  ['irene', 'Irene Castro'],
  ['julian', 'Julián Mora'],
];

// Designed so that, logged in as ana, every graph query returns data:
// C2 diego (via bruno and carla), C3 with fabian, C4 up to hector (3 hops, irene is 4),
// C5 ana -> irene (4 degrees) and ana -> julian (no path), C7 posts reacted by bruno and carla.
const FOLLOWS = [
  ['ana', 'bruno'], ['ana', 'carla'],
  ['bruno', 'ana'], ['bruno', 'diego'], ['bruno', 'elena'],
  ['carla', 'ana'], ['carla', 'diego'], ['carla', 'fabian'],
  ['diego', 'gabriela'],
  ['elena', 'ana'],
  ['fabian', 'bruno'], ['fabian', 'carla'], ['fabian', 'hector'],
  ['gabriela', 'hector'],
  ['hector', 'irene'],
];

// [key, author, text, image color or null]
const POSTS = [
  ['ana1', 'ana', 'Primer día en la red social distribuida. ¡Hola a todos!', null],
  ['bruno1', 'bruno', 'Terminé de configurar Neo4j: los grafos son otra forma de pensar los datos.', null],
  ['carla1', 'carla', 'Atardecer desde la terraza de la facultad.', [236, 112, 99]],
  ['carla2', 'carla', '¿Alguien más estudiando para el parcial de Sistemas Distribuidos?', null],
  ['diego1', 'diego', 'Mi escritorio de trabajo para el proyecto final.', [52, 152, 219]],
  ['diego2', 'diego', 'Descubrí que shortestPath resuelve los grados de separación en una sola consulta.', null],
  ['elena1', 'elena', 'Ruta en bicicleta de este fin de semana.', [46, 204, 113]],
  ['fabian1', 'fabian', 'Recomiendo leer sobre el teorema CAP antes del examen.', null],
  ['gabriela1', 'gabriela', 'Nueva ilustración terminada.', [155, 89, 182]],
  ['hector1', 'hector', 'Probando los WebSockets del chat entre dos instancias.', null],
  ['irene1', 'irene', 'Hoy aprendí cómo funciona Web Push con VAPID.', null],
  ['julian1', 'julian', 'Recién llegado, todavía no sigo a nadie.', null],
];

// [user, post key]
const REACTIONS = [
  ['bruno', 'diego1'], ['carla', 'diego1'],
  ['carla', 'elena1'],
  ['bruno', 'gabriela1'],
  ['carla', 'diego2'],
  ['ana', 'bruno1'], ['ana', 'carla1'],
  ['bruno', 'ana1'], ['elena', 'ana1'],
  ['fabian', 'carla2'], ['diego', 'gabriela1'], ['hector', 'irene1'],
];

async function api(method, path, { token, json, form } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let body;
  if (json) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form; // fetch sets the multipart boundary
  }
  let response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, { method, headers, body });
  } catch (error) {
    throw new Error(`No se pudo conectar con ${BASE_URL} (${error.cause?.code ?? error.message}). ¿Está levantado el stack?`);
  }
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(`${method} ${path} respondió ${response.status}: ${text}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function main() {
  console.log(`Sembrando datos de demostración en ${BASE_URL}\n`);
  const users = {};

  for (const [username, nombre] of USERS) {
    try {
      const profile = await api('POST', '/auth/registro', {
        json: { username, email: `${username}@demo.local`, password: PASSWORD, nombre },
      });
      const { token } = await api('POST', '/auth/login', { json: { username, password: PASSWORD } });
      users[username] = { id: profile.id, token };
    } catch (error) {
      if (error.status === 409) {
        throw new Error(`El usuario "${username}" ya existe. El script parte de una base vacía: `
            + 'ejecutar "docker compose down -v" y volver a levantar el stack.');
      }
      throw error;
    }
  }
  console.log(`Usuarios: ${USERS.length}`);

  for (const [follower, followed] of FOLLOWS) {
    await api('POST', `/usuarios/${users[followed].id}/seguir`, { token: users[follower].token });
  }
  console.log(`Seguimientos: ${FOLLOWS.length}`);

  const posts = {};
  for (const [key, author, texto, color] of POSTS) {
    const form = new FormData();
    form.append('texto', texto);
    if (color) {
      form.append('archivo', new Blob([demoImage(color)], { type: 'image/png' }), `${key}.png`);
    }
    posts[key] = (await api('POST', '/posts', { token: users[author].token, form })).id;
  }
  console.log(`Publicaciones: ${POSTS.length} (${POSTS.filter((p) => p[3]).length} con imagen)`);

  for (const [user, key] of REACTIONS) {
    await api('POST', `/posts/${posts[key]}/reacciones`, { token: users[user].token });
  }
  console.log(`Reacciones: ${REACTIONS.length}\n`);

  await verify(users);

  console.log(`\nListo. Todos los usuarios usan la contraseña ${PASSWORD}; conviene iniciar sesión como "ana".`);
}

// Reads back the graph queries as ana so a broken seed fails loudly instead of at the demo.
async function verify(users) {
  const token = users.ana.token;
  const suggestions = await api('GET', '/usuarios/me/sugerencias', { token });
  const mutuals = await api('GET', `/usuarios/${users.fabian.id}/en-comun`, { token });
  const reach = await api('GET', '/usuarios/me/alcance', { token });
  const separation = await api('GET', `/usuarios/${users.irene.id}/separacion`, { token });
  const noPath = await api('GET', `/usuarios/${users.julian.id}/separacion`, { token });
  const discover = await api('GET', '/descubrir', { token });
  const feed = await api('GET', '/feed?page=0', { token });

  const checks = [
    ['C1 feed de ana', feed.length > 0, `${feed.length} publicaciones`],
    ['C2 sugerencias de ana', suggestions.some((s) => s.enComun > 1),
      suggestions.map((s) => `${s.username} (${s.enComun} en común)`).join(', ')],
    ['C3 en común ana/fabian', mutuals.length > 0, mutuals.map((u) => u.username).join(', ')],
    ['C4 alcance de ana', reach.some((u) => u.distancia === 3),
      reach.map((u) => `${u.username}:${u.distancia}`).join(', ')],
    ['C5 separación ana/irene', separation.grados > 1, `${separation.grados} grados: ${separation.cadena.join(' → ')}`],
    ['C5 sin camino ana/julian', noPath.grados === null, 'grados null'],
    ['C7 descubrir de ana', discover.length > 0,
      discover.map((p) => `${p.autor.username} (${p.amigosQueReaccionaron})`).join(', ')],
  ];
  for (const [name, ok, detail] of checks) {
    console.log(`${ok ? 'OK   ' : 'FALLA'} ${name}: ${detail}`);
  }
  if (checks.some(([, ok]) => !ok)) {
    throw new Error('Alguna consulta del grafo quedó sin resultados.');
  }
}

// Minimal PNG encoder (RGB, 8 bits) so the demo images need no binary files in the repo.
function demoImage([r, g, b], width = 480, height = 320) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const inCircle = (x - width * 0.7) ** 2 + (y - height * 0.35) ** 2 < (height * 0.18) ** 2;
      const shade = inCircle ? 1.35 : 0.55 + 0.45 * (1 - y / height);
      const i = row + 1 + x * 3;
      raw[i] = Math.min(255, r * shade);
      raw[i + 1] = Math.min(255, g * shade);
      raw[i + 2] = Math.min(255, b * shade);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // color type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

main().catch((error) => {
  console.error(`\nError: ${error.message}`);
  process.exit(1);
});
