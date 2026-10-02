import { expect, test, type Page } from "@playwright/test";

const user = { id: "u1", nombre: "Luis", username: "luis", bio: "" };
const author = { id: "u2", nombre: "José", username: "jose", bio: "" };
const makePost = (index: number) => ({
  id: "p" + index,
  texto: "Avance del proyecto " + index,
  fecha: "2026-09-27T14:00:00Z",
  autor: author,
  mediaKey: null as string | null,
  mediaTipo: null as string | null,
  mediaUrl: null as string | null,
  reacciones: index,
  reaccionado: false,
});
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=",
  "base64",
);
async function setup(page: Page, feed = [makePost(1)]) {
  await page.routeWebSocket(/\/ws\/chat/, () => {});
  const token =
    "header." +
    Buffer.from(JSON.stringify({ exp: Date.now() / 1000 + 3600 })).toString(
      "base64url",
    ) +
    ".signature";
  await page.addInitScript(
    (session) =>
      localStorage.setItem("nodouni.session", JSON.stringify(session)),
    { token, user },
  );
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/usuarios/me" || path === "/api/usuarios/u1")
      return route.fulfill({ json: user });
    if (path === "/api/usuarios/u2") return route.fulfill({ json: author });
    if (path === "/api/feed") {
      const pageNumber = Number(
        new URL(route.request().url()).searchParams.get("page"),
      );
      return route.fulfill({
        json: feed.slice(pageNumber * 20, (pageNumber + 1) * 20),
      });
    }
    if (path === "/api/posts/p1")
      return route.fulfill({ json: feed[0] ?? makePost(1) });
    if (path === "/api/usuarios/u2/posts")
      return route.fulfill({ json: [makePost(1)] });
    if (path.endsWith("/separacion"))
      return route.fulfill({ json: { grados: null, cadena: [] } });
    return route.fulfill({ json: [] });
  });
}

test("Inicio abre en Siguiendo y muestra Para ti en una sola pestaña", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/feed");
  const tabs = page.getByRole("navigation", {
    name: "Tipo de publicaciones",
  });
  await expect(tabs.getByRole("link", { name: "Siguiendo" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("article")).toHaveCount(1);

  await tabs.getByRole("link", { name: "Para ti" }).click();
  await expect(page).toHaveURL(/\/feed\?vista=para-ti$/);
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).not.toContainText("Descubrir");

  await page.goto("/descubrir");
  await expect(page).toHaveURL(/\/feed\?vista=para-ti$/);
});

test("feed pagina sin duplicados y conserva tarjetas al reintentar una página", async ({
  page,
}) => {
  await setup(
    page,
    Array.from({ length: 21 }, (_, index) => makePost(index + 1)),
  );
  let failNext = true;
  await page.route("**/api/feed?page=1", async (route) => {
    if (failNext) {
      failNext = false;
      return route.fulfill({
        status: 503,
        json: { error: "TEMPORAL", mensaje: "Intenta nuevamente" },
      });
    }
    // An offset page can overlap when new posts arrive.
    return route.fulfill({ json: [makePost(20), makePost(21)] });
  });
  await page.goto("/feed");
  await expect(page.getByRole("article")).toHaveCount(20);
  await page.getByRole("button", { name: "Cargar más publicaciones" }).click();
  await expect(page.getByRole("alert")).toContainText("Intenta nuevamente");
  await expect(page.getByRole("article")).toHaveCount(20);
  await page.getByRole("button", { name: "Volver a intentar" }).click();
  await expect(page.getByRole("article")).toHaveCount(21);
  await expect(
    page.getByText("Has visto todas las publicaciones disponibles."),
  ).toBeVisible();
  await expect(page.getByText("21 reacciones", { exact: true })).toBeVisible();
});

test("crear con imagen conserva el borrador al fallar y abre el detalle tras guardar", async ({
  page,
}) => {
  await setup(page);
  let attempts = 0;
  await page.route("**/api/posts", async (route) => {
    attempts += 1;
    const request = route.request();
    expect(request.method()).toBe("POST");
    expect(request.headers()["content-type"]).toContain(
      "multipart/form-data; boundary=",
    );
    expect(request.postDataBuffer()?.toString()).toContain('name="texto"');
    expect(request.postDataBuffer()?.toString()).toContain(
      'name="archivo"; filename="imagen.png"',
    );
    if (attempts === 1)
      return route.fulfill({
        status: 503,
        json: {
          error: "ALMACENAMIENTO_NO_DISPONIBLE",
          mensaje: "No se pudo guardar la imagen",
        },
      });
    return route.fulfill({ status: 201, json: makePost(1) });
  });
  await page.goto("/feed");
  await page
    .getByLabel("Texto de la publicación")
    .fill("Mi primera publicación");
  await page
    .getByLabel("Añadir imagen")
    .setInputFiles({ name: "imagen.png", mimeType: "image/png", buffer: png });
  await expect(
    page.getByAltText("Vista previa de la imagen adjunta"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "No se pudo guardar la imagen",
  );
  await expect(page.getByLabel("Texto de la publicación")).toHaveValue(
    "Mi primera publicación",
  );
  await expect(
    page.getByAltText("Vista previa de la imagen adjunta"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  const confirmation = page
    .getByRole("status")
    .filter({ hasText: "Tu publicación está lista." });
  await expect(confirmation).toBeVisible();
  await expect(page.getByLabel("Texto de la publicación")).toHaveValue("");
  await expect(
    page.getByAltText("Vista previa de la imagen adjunta"),
  ).toHaveCount(0);
  await confirmation.getByRole("link", { name: "Ver publicación" }).click();
  await expect(page).toHaveURL(/\/posts\/p1$/);
  await expect(page.getByRole("article")).toContainText(
    "Avance del proyecto 1",
  );
  expect(attempts).toBe(2);
});

test("feed vacío, validación local y perfil de autor funcionan en móvil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, []);
  await page.goto("/feed");
  await expect(
    page.getByRole("heading", { name: "Tu feed está por comenzar" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publicar", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Texto de la publicación").fill("a".repeat(10));
  await expect(page.getByText("10 / 5000")).toHaveCount(0);
  await page.getByLabel("Texto de la publicación").fill("a".repeat(5001));
  await expect(
    page.getByRole("button", { name: "Publicar", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Texto de la publicación"),
  ).toHaveAccessibleDescription("5001 / 5000");
  await page.getByLabel("Añadir imagen").setInputFiles({
    name: "no.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg />"),
  });
  await expect(page.getByRole("alert")).toContainText("PNG, JPEG o GIF");
  await page.getByLabel("Texto de la publicación").fill("Texto válido");
  await page
    .getByLabel("Añadir imagen")
    .setInputFiles({ name: "imagen.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Quitar imagen" }).click();
  await expect(
    page.getByAltText("Vista previa de la imagen adjunta"),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/usuarios/u2");
  await expect(page.getByRole("article")).toContainText(
    "Avance del proyecto 1",
  );
  await page.getByText("Avance del proyecto 1").click();
  await expect(
    page.getByRole("heading", { name: "Publicación", exact: true }),
  ).toBeVisible();
});

test("detalle desde enlace directo carga media y muestra un 404 recuperable", async ({
  page,
}) => {
  const post = {
    ...makePost(1),
    mediaKey: "posts/p1/imagen.png",
    mediaTipo: "image/png",
    mediaUrl: "/media/posts/p1/imagen.png",
  };
  await setup(page, [post]);
  await page.route("**/media/posts/p1/imagen.png", (route) =>
    route.fulfill({ contentType: "image/png", body: png }),
  );
  await page.goto("/posts/p1");
  const image = page.getByAltText("Imagen de la publicación");
  await expect(image).toBeVisible();
  expect(
    await image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
  ).toBe(1);
  await page.route("**/api/posts/missing", (route) =>
    route.fulfill({
      status: 404,
      json: {
        error: "POST_NO_ENCONTRADO",
        mensaje: "La publicación no existe",
      },
    }),
  );
  await page.goto("/posts/missing");
  await expect(page.getByRole("alert")).toContainText(
    "La publicación no existe",
  );
  await expect(page.getByRole("article")).toHaveCount(0);
});

test("reaccionar actualiza estado y contador solo tras confirmar el servidor", async ({
  page,
}) => {
  await setup(page);
  const methods: string[] = [];
  let fail = false;
  await page.route("**/api/posts/p1/reacciones", async (route) => {
    methods.push(route.request().method());
    if (fail)
      return route.fulfill({
        status: 503,
        json: { error: "TEMPORAL", mensaje: "Servicio no disponible" },
      });
    return route.fulfill({ status: 204 });
  });
  await page.goto("/feed");
  const like = page.getByRole("button", {
    name: "Me gusta, 1 reacción",
    exact: true,
  });
  await expect(like).toHaveAttribute("aria-pressed", "false");
  await expect(like).toContainText("1 reacción");
  await like.click();
  const unlike = page.getByRole("button", {
    name: "Quitar Me gusta, 2 reacciones",
    exact: true,
  });
  await expect(unlike).toHaveAttribute("aria-pressed", "true");
  await expect(unlike).toContainText("2 reacciones");
  await unlike.click();
  await expect(like).toHaveAttribute("aria-pressed", "false");
  await expect(like).toContainText("1 reacción");
  fail = true;
  await like.click();
  await expect(page.getByRole("alert")).toContainText(
    "No pudimos actualizar tu reacción",
  );
  await expect(like).toHaveAttribute("aria-pressed", "false");
  await expect(like).toContainText("1 reacción");
  expect(methods).toEqual(["POST", "DELETE", "POST"]);
});

const makeComment = (
  id: string,
  texto: string,
  autor: typeof user,
  respondeA: string | null = null,
) => ({
  id,
  texto,
  fecha: "2026-10-02T10:00:00Z",
  autor,
  respondeA,
  respuestas: 0,
});

async function routeComments(
  page: Page,
  initial: ReturnType<typeof makeComment>[],
) {
  const sent: unknown[] = [];
  await page.route("**/api/posts/p1/comentarios", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: initial });
    const body = route.request().postDataJSON() as {
      texto: string;
      respondeA: string | null;
    };
    sent.push(body);
    return route.fulfill({
      status: 201,
      json: makeComment("n" + sent.length, body.texto, user, body.respondeA),
    });
  });
  return sent;
}

test("comentar y responder en el detalle actualiza hilo y contador sin recargar", async ({
  page,
}) => {
  await setup(page, [{ ...makePost(1), comentarios: 2 }]);
  const sent = await routeComments(page, [
    makeComment("c1", "¿Cuándo es la entrega?", author),
    makeComment("c2", "El viernes.", user, "c1"),
  ]);
  await page.goto("/feed");
  await page.getByRole("link", { name: "2 comentarios" }).click();
  await expect(page).toHaveURL(/\/posts\/p1$/);

  await expect(page.getByText("¿Cuándo es la entrega?")).toBeVisible();
  await expect(page.getByText("El viernes.")).toHaveCount(0);
  await page.getByRole("button", { name: "Ver 1 respuesta" }).click();
  await expect(page.getByText("El viernes.")).toBeVisible();

  await page.getByLabel("Texto del comentario").fill("Gracias por avisar");
  await page.getByRole("button", { name: "Comentar" }).click();
  await expect(
    page.getByText("Gracias por avisar", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("3 comentarios")).toBeVisible();
  await expect(page.getByLabel("Texto del comentario")).toHaveValue("");

  await page
    .getByRole("article", { name: author.nombre })
    .getByRole("button", { name: "Responder" })
    .click();
  const reply = page.getByLabel("Respuesta a " + author.nombre);
  await reply.fill("Yo llevo las diapositivas");
  await page
    .locator("form", { has: reply })
    .getByRole("button", { name: "Responder" })
    .click();
  await expect(
    page.getByText("Yo llevo las diapositivas", { exact: true }),
  ).toBeVisible();
  await expect(reply).toHaveCount(0);
  await expect(page.getByText("4 comentarios")).toBeVisible();

  expect(sent).toEqual([
    { texto: "Gracias por avisar", respondeA: null },
    { texto: "Yo llevo las diapositivas", respondeA: "c1" },
  ]);
});

test("un hilo profundo no desborda el ancho en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, [{ ...makePost(1), comentarios: 8 }]);
  const chain = Array.from({ length: 8 }, (_, level) =>
    makeComment(
      "d" + level,
      "Respuesta de nivel " + level + " con un texto algo largo para el hilo",
      level % 2 ? user : author,
      level ? "d" + (level - 1) : null,
    ),
  );
  await routeComments(page, chain);
  await page.goto("/posts/p1");

  for (let level = 0; level < 7; level++) {
    await page.getByRole("button", { name: "Ver 1 respuesta" }).click();
  }
  await expect(page.getByText(/nivel 7/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const indents = await page
    .getByText(/nivel [3-7] /)
    .evaluateAll((items) =>
      items.map((item) => Math.round(item.getBoundingClientRect().left)),
    );
  expect(new Set(indents.slice(1)).size).toBe(1);
});
