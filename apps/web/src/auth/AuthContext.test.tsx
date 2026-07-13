import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
import { setAuthToken } from "../lib/api";

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
