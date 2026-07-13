import { afterEach, expect, test, vi } from "vitest";
import { apiFetch, setAuthToken, getAuthToken } from "./api";

afterEach(() => {
  setAuthToken(null);
  vi.restoreAllMocks();
});

test("attaches the bearer token when set", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);

  setAuthToken("abc123");
  expect(getAuthToken()).toBe("abc123");
  await apiFetch("/api/auth/me");

  const headers = new Headers(fetchMock.mock.calls[0][1].headers);
  expect(headers.get("Authorization")).toBe("Bearer abc123");
});

test("omits the Authorization header when no token is set", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  await apiFetch("/api/health");
  const headers = new Headers(fetchMock.mock.calls[0][1].headers);
  expect(headers.get("Authorization")).toBeNull();
});
