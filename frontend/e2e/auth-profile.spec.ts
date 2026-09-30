import { expect, test, type Page } from "@playwright/test";

const current = {
  id: "u1",
  username: "luis",
  nombre: "Luis Anchundia",
  bio: "Aprendiendo en comunidad.",
};
const other = {
  id: "u2",
  username: "jose",
  nombre: "José Pérez",
  bio: "Sistemas distribuidos.",
};
const token = () =>
  "header." +
  Buffer.from(JSON.stringify({ exp: Date.now() / 1000 + 3600 })).toString(
    "base64url",
  ) +
  ".signature";

async function mockApi(page: Page) {
  let profile = { ...current };
  let follows = false;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path === "/api/auth/registro") {
      const body = request.postDataJSON();
      if (body.username === "duplicado")
        return route.fulfill({
          status: 409,
          json: {
            error: "USERNAME_EN_USO",
            mensaje: "El nombre de usuario ya está en uso",
          },
        });
      expect(Object.keys(body).sort()).toEqual([
        "email",
        "nombre",
        "password",
        "username",
      ]);
      return route.fulfill({
        status: 201,
        json: {
          id: "new",
          username: body.username,
          nombre: body.nombre,
          bio: "",
        },
      });
    }
    if (path === "/api/auth/login") {
      const body = request.postDataJSON();
      if (body.password === "incorrecta")
        return route.fulfill({
          status: 401,
          json: {
            error: "CREDENCIALES_INVALIDAS",
            mensaje: "Usuario o contraseña incorrectos",
          },
        });
      return route.fulfill({ json: { token: token() } });
    }
    expect(request.headers().authorization).toMatch(/^Bearer /);
    if (path === "/api/feed" || path.endsWith("/posts"))
      return route.fulfill({ json: [] });
    if (
      path.endsWith("/sugerencias") ||
      path.endsWith("/alcance") ||
      path.endsWith("/en-comun")
    )
      return route.fulfill({ json: [] });
    if (path.endsWith("/separacion"))
      return route.fulfill({ json: { grados: null, cadena: [] } });
    if (path === "/api/usuarios/me") {
      if (request.method() === "PUT")
        profile = { ...profile, ...request.postDataJSON() };
      return route.fulfill({ json: profile });
    }
    if (path === "/api/usuarios") {
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      return route.fulfill({
        json: [profile, other].filter((u) =>
          (u.nombre + " " + u.username).toLowerCase().includes(q),
        ),
      });
    }
    if (path === "/api/usuarios/u1") return route.fulfill({ json: profile });
    if (path === "/api/usuarios/u2") return route.fulfill({ json: other });
    if (path === "/api/usuarios/u2/seguir") {
      follows = request.method() === "POST";
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith("/seguidores"))
      return route.fulfill({
        json: path.includes("/u2/") && follows ? [profile] : [],
      });
    if (path.endsWith("/seguidos"))
      return route.fulfill({
        json: path.includes("/u1/") && follows ? [other] : [],
      });
    return route.fulfill({
      status: 404,
      json: { error: "USUARIO_NO_ENCONTRADO", mensaje: "El usuario no existe" },
    });
  });
}
async function login(page: Page, destination = "/feed") {
  await page.goto(destination);
  await page.getByLabel("Nombre de usuario", { exact: true }).fill("luis");
  await page.getByLabel("Contraseña", { exact: true }).fill("prueba-local");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(destination.replace("?", "\\?") + "$"),
  );
}
test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("registro respeta el contrato y lleva al login con confirmación", async ({
  page,
}) => {
  await page.goto("/registro");
  await page.getByLabel("Nombre completo").fill("Nueva Persona");
  await page.getByLabel("Nombre de usuario").fill("nueva");
  await page.getByLabel("Correo electrónico").fill("nueva@example.test");
  await page.getByLabel("Contraseña").fill("prueba-local");
  await page
    .getByRole("button", { name: "Crear una cuenta", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("status")).toContainText("Tu cuenta está lista");
  await expect(page.getByLabel("Nombre de usuario")).toHaveValue("nueva");
  expect(
    await page.evaluate(() => localStorage.getItem("nodouni.session")),
  ).toBeNull();
});

test("login recupera la ruta privada, persiste la sesión y permite salir", async ({
  page,
}) => {
  let profileRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/usuarios/me")
      profileRequests += 1;
  });
  await login(page, "/perfil");
  await expect(
    page.getByRole("heading", { name: "Mi perfil", exact: true }),
  ).toBeVisible();
  expect(profileRequests).toBe(1);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Mi perfil", exact: true }),
  ).toBeVisible();
  expect(profileRequests).toBeGreaterThan(1);
  if (
    await page
      .getByRole("button", { name: "Abrir opciones de cuenta" })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Abrir opciones de cuenta" })
      .click();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(() => localStorage.getItem("nodouni.session")),
  ).toBeNull();
});

test("perfil propio guarda nombre y bio y actualiza el Context", async ({
  page,
}) => {
  await login(page, "/perfil");
  await page.getByRole("button", { name: "Editar perfil" }).click();
  await page.getByLabel("Nombre completo").fill("Luis Actualizado");
  await page.getByLabel("Biografía").fill("Mi nueva biografía.");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(
    page.getByRole("heading", { name: "Luis Actualizado" }),
  ).toBeVisible();
  await expect(
    page.getByText("Mi nueva biografía.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("nodouni.session")!).user.nombre,
    ),
  ).toBe("Luis Actualizado");
  await page.screenshot({
    path: ".stitch/qa/profile-desktop.png",
    fullPage: true,
  });
});

test("búsqueda, perfil ajeno, seguir, listas y dejar de seguir", async ({
  page,
}) => {
  await login(page, "/explorar");
  await expect(
    page.getByRole("heading", { name: "Amigos", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Buscar personas", { exact: true }).fill("jose");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "José Pérez", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: ".stitch/qa/explore-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: /José Pérez.*Ver perfil/ }).click();
  await page.getByRole("button", { name: "Seguir", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Dejar de seguir", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "1 Seguidores", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Dejar de seguir", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "0 Seguidores", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "0 Seguidos", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Seguidos", exact: true }),
  ).toBeVisible();
});

test("errores de credenciales y registro duplicado muestran mensaje del servidor", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Nombre de usuario").fill("luis");
  await page.getByLabel("Contraseña").fill("incorrecta");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "Usuario o contraseña incorrectos",
  );
  await page.goto("/registro");
  await page.getByLabel("Nombre completo").fill("Persona");
  await page.getByLabel("Nombre de usuario").fill("duplicado");
  await page.getByLabel("Correo electrónico").fill("persona@example.test");
  await page.getByLabel("Contraseña").fill("prueba-local");
  await page
    .getByRole("button", { name: "Crear una cuenta", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "El nombre de usuario ya está en uso",
  );
});

test("un 401 privado cierra la sesión; una búsqueda vacía es recuperable", async ({
  page,
}) => {
  await login(page, "/explorar");
  await page
    .getByLabel("Buscar personas", { exact: true })
    .fill("sinresultados");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No encontramos coincidencias" }),
  ).toBeVisible();
  await page.route("**/api/usuarios/me", (route) =>
    route.fulfill({
      status: 401,
      json: { error: "NO_AUTENTICADO", mensaje: "Sesión vencida" },
    }),
  );
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(() => localStorage.getItem("nodouni.session")),
  ).toBeNull();
});

test("fallo de red muestra error y permite reintentar", async ({ page }) => {
  await login(page, "/explorar");
  await page.route("**/api/usuarios?q=*", (route) => route.abort("failed"));
  await page.getByRole("searchbox").fill("José");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("No pudimos conectar");
  await page.unroute("**/api/usuarios?q=*");
  await page.getByRole("button", { name: "Volver a intentar" }).click();
  await expect(page.getByRole("heading", { name: "José Pérez" })).toBeVisible();
});

test("móvil mantiene navegación, formularios y cierre de sesión accesibles", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.screenshot({
    path: ".stitch/qa/login-mobile.png",
    fullPage: true,
  });
  await login(page, "/explorar");
  await page.getByRole("button", { name: "Abrir opciones de cuenta" }).click();
  await page
    .getByRole("link", { name: "Perfil Edita tu nombre y biografía" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mi perfil", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".stitch/qa/profile-mobile.png",
    fullPage: true,
  });
  if (
    await page
      .getByRole("button", { name: "Abrir opciones de cuenta" })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Abrir opciones de cuenta" })
      .click();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
});

test("captura login de escritorio y navegación desconocida", async ({
  page,
}) => {
  await page.goto("/login");
  await page.screenshot({
    path: ".stitch/qa/login-desktop.png",
    fullPage: true,
  });
  await login(page);
  await page.goto("/ruta-inexistente");
  await expect(
    page.getByRole("heading", { name: "No encontramos esta página" }),
  ).toBeVisible();
});
test("restauración fallida permite reintentar o cerrar sesión sin quedar atrapado", async ({
  page,
}) => {
  await login(page, "/perfil");
  await page.route("**/api/usuarios/me", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: "NO_DISPONIBLE",
        mensaje: "Servicio temporalmente no disponible",
      },
    }),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Servicio temporalmente no disponible",
  );
  await page.unroute("**/api/usuarios/me");
  await page.getByRole("button", { name: "Volver a intentar" }).click();
  await expect(
    page.getByRole("heading", { name: "Mi perfil", exact: true }),
  ).toBeVisible();
  await page.route("**/api/usuarios/me", (route) =>
    route.fulfill({
      status: 404,
      json: { error: "USUARIO_NO_ENCONTRADO", mensaje: "El usuario no existe" },
    }),
  );
  await page.reload();
  if (
    await page
      .getByRole("button", { name: "Abrir opciones de cuenta" })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Abrir opciones de cuenta" })
      .click();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
});

test("el registro rechaza correo vacío antes de llamar al backend", async ({
  page,
}) => {
  let registrations = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/auth/registro")
      registrations += 1;
  });
  await page.goto("/registro");
  await page.getByLabel("Nombre completo").fill("Persona");
  await page.getByLabel("Nombre de usuario").fill("persona");
  await page.getByLabel("Contraseña").fill("prueba-local");
  await page
    .getByRole("form", { name: "Crear una cuenta", exact: true })
    .evaluate((form) => {
      (form as HTMLFormElement).noValidate = true;
    });
  await page
    .getByRole("button", { name: "Crear una cuenta", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Completa los campos obligatorios",
  );
  expect(registrations).toBe(0);
});
