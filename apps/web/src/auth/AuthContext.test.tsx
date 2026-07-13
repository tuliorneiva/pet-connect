import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
import { getAuthToken, setAuthToken } from "../lib/api";

afterEach(() => {
  setAuthToken(null);
  vi.restoreAllMocks();
});

function Probe() {
  const { user, loading } = useAuth();
  if (loading) return <p>carregando</p>;
  return <p>{user ? user.email : "anon"}</p>;
}

test("shows anonymous when there is no token", async () => {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByText("anon")).toBeInTheDocument());
});

test("hydrates the user from /me when a token exists", async () => {
  setAuthToken("t");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: "Ana", email: "ana@x.org", org_id: 1 }), { status: 200 }),
    ),
  );
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByText("ana@x.org")).toBeInTheDocument());
});

function LoginProbe() {
  const { login, user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        onClick={() => {
          login({ email: "ana@x.org", password: "secret" }).catch((err) => setError(String(err)));
        }}
      >
        login
      </button>
      <p>{loading ? "carregando" : user ? user.email : "anon"}</p>
      {error && <p>error:{error}</p>}
    </div>
  );
}

test("clears the token when the post-login /me hydration fails", async () => {
  const loginResponse = new Response(
    JSON.stringify({ access_token: "brand-new-token", token_type: "bearer" }),
    { status: 200 },
  );
  const meFailureResponse = new Response("{}", { status: 401 });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce(loginResponse).mockResolvedValueOnce(meFailureResponse),
  );

  render(
    <AuthProvider>
      <LoginProbe />
    </AuthProvider>,
  );

  await waitFor(() => expect(screen.getByText("anon")).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "login" }));

  await waitFor(() => expect(screen.getByText(/^error:/)).toBeInTheDocument());
  expect(getAuthToken()).toBeNull();
});
