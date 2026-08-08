import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { adminApi } from "./adminApi";
import { setAuthToken } from "./api";

const ANIMAL = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  setAuthToken("token-de-teste");
});

afterEach(() => {
  setAuthToken(null);
  vi.restoreAllMocks();
});

function mockFetch(body: unknown, status = 200) {
  const spy = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", spy);
  return spy;
}

test("uploadPhoto envia multipart e deixa o navegador definir o boundary", async () => {
  const spy = mockFetch({ id: "p1", url: "https://cdn/x.jpg", sort_order: 0 });
  const file = new File(["conteudo"], "foto.jpg", { type: "image/jpeg" });

  await adminApi.uploadPhoto(ANIMAL, file);

  const [url, init] = spy.mock.calls[0];
  expect(url).toContain(`/api/admin/animals/${ANIMAL}/photos`);
  expect(init.method).toBe("POST");
  expect(init.body).toBeInstanceOf(FormData);
  // Content-Type fixo em JSON quebraria o multipart: sem boundary o servidor não parseia.
  expect(new Headers(init.headers).get("Content-Type")).toBeNull();
  // e a autenticação continua indo
  expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token-de-teste");
});

test("uploadPhoto manda o arquivo no campo 'file'", async () => {
  const spy = mockFetch({ id: "p1", url: "https://cdn/x.jpg", sort_order: 0 });
  const file = new File(["conteudo"], "foto.jpg", { type: "image/jpeg" });

  await adminApi.uploadPhoto(ANIMAL, file);

  const body = spy.mock.calls[0][1].body as FormData;
  expect(body.get("file")).toBe(file);
});

test("uploadPhoto propaga a mensagem de erro da API", async () => {
  mockFetch({ detail: "A foto precisa ser JPG, PNG ou WEBP." }, 422);
  const file = new File(["x"], "a.pdf", { type: "application/pdf" });

  await expect(adminApi.uploadPhoto(ANIMAL, file)).rejects.toThrow(
    "A foto precisa ser JPG, PNG ou WEBP.",
  );
});

test("deletePhoto chama a rota certa e aceita 204 sem corpo", async () => {
  const spy = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", spy);

  await expect(adminApi.deletePhoto(ANIMAL, "p1")).resolves.toBeUndefined();
  expect(spy.mock.calls[0][0]).toContain(`/api/admin/animals/${ANIMAL}/photos/p1`);
  expect(spy.mock.calls[0][1].method).toBe("DELETE");
});

test("setCoverPhoto devolve a nova ordem", async () => {
  mockFetch([
    { id: "p2", url: "https://cdn/b.jpg", sort_order: 0 },
    { id: "p1", url: "https://cdn/a.jpg", sort_order: 1 },
  ]);

  const ordered = await adminApi.setCoverPhoto(ANIMAL, "p2");

  expect(ordered.map((p) => p.id)).toEqual(["p2", "p1"]);
});
