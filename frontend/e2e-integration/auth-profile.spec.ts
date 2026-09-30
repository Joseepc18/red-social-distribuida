import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("registro, sesión, perfil y seguimiento contra el backend real", async ({
  page,
}) => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const account = {
    username: "qa_luis_" + suffix,
    nombre: "Luis Validación " + suffix,
    email: "qa_luis_" + suffix + "@example.test",
    password: randomUUID(),
  };
  const peer = {
    username: "qa_peer_" + suffix,
    nombre: "Compañero Validación " + suffix,
    email: "qa_peer_" + suffix + "@example.test",
    password: randomUUID(),
  };
  const peerRegistration = await page.request.post("/api/auth/registro", {
    data: peer,
  });
  expect(peerRegistration.status()).toBe(201);
  const peerProfile = await peerRegistration.json();

  await page.goto("/perfil");
  await expect(page).toHaveURL(/\/login$/);
  await page
    .getByRole("link", { name: "Crear una cuenta", exact: true })
    .click();
  await page.getByLabel("Nombre completo").fill(account.nombre);
  await page.getByLabel("Nombre de usuario").fill(account.username);
  await page.getByLabel("Correo electrónico").fill(account.email);
  await page.getByLabel("Contraseña").fill(account.password);
  await page
    .getByRole("button", { name: "Crear una cuenta", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Tu cuenta está lista");

  await page.getByLabel("Contraseña").fill(account.password);
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mi perfil", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: account.nombre, exact: true }),
  ).toBeVisible();

  const updatedName = "Perfil actualizado " + suffix;
  await page.getByRole("button", { name: "Editar perfil" }).click();
  await page.getByLabel("Nombre completo").fill(updatedName);
  await page.getByLabel("Biografía").fill("Biografía guardada en Neo4j.");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(
    page.getByRole("heading", { name: updatedName, exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Biografía guardada en Neo4j.", { exact: true }),
  ).toBeVisible();

  await page.goto("/explorar");
  await page.getByLabel("Buscar personas", { exact: true }).fill(peer.username);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page
    .getByRole("link", { name: new RegExp(peer.nombre + ".*Ver perfil") })
    .click();
  await expect(page).toHaveURL(new RegExp("/usuarios/" + peerProfile.id + "$"));
  await page.getByRole("button", { name: "Seguir", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "1 Seguidores", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Dejar de seguir", exact: true }),
  ).toBeVisible();
  await page.goto("/perfil");
  await page.getByRole("button", { name: "1 Seguidos", exact: true }).click();
  await page
    .getByRole("link", { name: new RegExp(peer.nombre + ".*Ver perfil") })
    .click();
  await page
    .getByRole("button", { name: "Dejar de seguir", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "0 Seguidores", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Abrir opciones de cuenta" }).click();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(() => localStorage.getItem("nodouni.session")),
  ).toBeNull();
  await page.getByLabel("Nombre de usuario").fill(account.username);
  await page.getByLabel("Contraseña").fill("incorrecta");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Usuario o contraseña incorrectos",
  );
});

test("el backend rechaza recursos privados y devuelve el contrato OpenAPI", async ({
  request,
}) => {
  const privateResponse = await request.get("/api/usuarios/me");
  expect(privateResponse.status()).toBe(401);
  expect(await privateResponse.json()).toMatchObject({
    error: expect.any(String),
    mensaje: expect.any(String),
  });
  const schema = await request.get("/api/openapi", {
    headers: { Accept: "application/json" },
  });
  expect(schema.ok()).toBe(true);
  const specification = await schema.json();
  expect(specification.paths["/api/auth/login"]).toBeDefined();
  expect(specification.paths["/api/usuarios/me"]).toBeDefined();
});
