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
  await page.getByLabel("Texto de la publicación").fill("a".repeat(5001));
  await expect(
    page.getByRole("button", { name: "Publicar", exact: true }),
  ).toBeDisabled();
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
  await page
    .getByRole("link", { name: "Ver publicación", exact: true })
    .click();
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
  const like = page.getByRole("button", { name: "Me gusta", exact: true });
  await expect(like).toHaveAttribute("aria-pressed", "false");
  await expect(like).toContainText("1 reacción");
  await like.click();
  const unlike = page.getByRole("button", {
    name: "Quitar Me gusta",
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
