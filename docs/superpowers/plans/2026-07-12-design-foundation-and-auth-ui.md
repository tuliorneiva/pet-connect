# PetConnect — Design Foundation & Auth UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the light-mode, teal, professional design system and build the auth UI (register ONG + login) with routing, public/admin layouts, and protected routes wired to the existing FastAPI auth API.

**Architecture:** React 19 + Vite + TS SPA. React Router for public/admin route split. A token-aware `apiFetch` stores the JWT in `localStorage`; an `AuthContext` hydrates the current user via `/api/auth/me` and guards admin routes. Design tokens live in CSS custom properties consumed by CSS-Module-scoped components.

**Tech Stack:** React 19, React Router v7 (`react-router-dom`), TypeScript, Vitest + Testing Library, plain CSS Modules + CSS custom properties (no UI framework).

## Global Constraints

- Light mode only — NO dark-mode variants or `prefers-color-scheme` handling.
- Palette (CSS custom properties): primary `#0E7490` (hover `#0C607A`), text `#0F172A`, secondary text `#5B7280`, border `#E2E8F0`, app bg `#F8FAFC`, surface `#FFFFFF`, success `#15803D`, error `#DC2626`, warning `#B45309`.
- Font: system sans-serif stack. Generous spacing. Subtle shadows. Visible `:focus-visible` outlines (accessibility for non-technical users).
- API base comes from `VITE_API_BASE` (already wired). All auth endpoints under `/api/auth`.
- The JWT is stored in `localStorage` under key `petconnect_token` and sent as `Authorization: Bearer <token>`.
- Node 20+ floor. Tests via `npm test` (Vitest, jsdom).
- All user-facing copy is Brazilian Portuguese (pt-BR).

---

## File Structure

- Create: `apps/web/src/styles/tokens.css` — CSS custom properties (palette, spacing, radius, shadow, type scale).
- Create: `apps/web/src/styles/global.css` — element base styles (body, links, focus-visible, headings).
- Modify: `apps/web/src/main.tsx` — import token/global CSS; wrap app in `BrowserRouter` + `AuthProvider`.
- Create: `apps/web/src/components/ui/Button.tsx` (+ `Button.module.css`) — button primitive.
- Create: `apps/web/src/components/ui/Field.tsx` (+ `Field.module.css`) — labeled input with error slot.
- Create: `apps/web/src/components/ui/Card.tsx` (+ `Card.module.css`) — surface container.
- Create: `apps/web/src/components/ui/Alert.tsx` (+ `Alert.module.css`) — inline message (error/success/warning).
- Modify: `apps/web/src/lib/api.ts` — token storage + auth-aware `apiFetch` + `authApi` (login/register/me).
- Create: `apps/web/src/auth/AuthContext.tsx` — `AuthProvider`, `useAuth`.
- Create: `apps/web/src/auth/ProtectedRoute.tsx` — redirects unauthenticated users to `/login`.
- Create: `apps/web/src/layouts/PublicLayout.tsx` (+ `PublicLayout.module.css`) — public header + `<Outlet/>`.
- Create: `apps/web/src/layouts/AdminLayout.tsx` (+ `AdminLayout.module.css`) — admin sidebar/topbar + `<Outlet/>`.
- Create: `apps/web/src/pages/public/HomePage.tsx` — public landing placeholder (vitrine lands in a later plan).
- Create: `apps/web/src/pages/auth/LoginPage.tsx` — login form.
- Create: `apps/web/src/pages/auth/RegisterPage.tsx` — register-ONG form.
- Create: `apps/web/src/pages/admin/DashboardPage.tsx` — admin dashboard placeholder (real dashboard later).
- Modify: `apps/web/src/App.tsx` — declare the route tree.
- Create: test files alongside (`*.test.tsx`).

---

### Task 1: Design tokens, global styles, and the Button primitive

**Files:**
- Create: `apps/web/src/styles/tokens.css`, `apps/web/src/styles/global.css`
- Create: `apps/web/src/components/ui/Button.tsx`, `apps/web/src/components/ui/Button.module.css`
- Modify: `apps/web/src/main.tsx`
- Test: `apps/web/src/components/ui/Button.test.tsx`

**Interfaces:**
- Produces: CSS custom properties on `:root`; `Button` component `({ variant?: "primary"|"secondary"|"ghost" } & ButtonHTMLAttributes)`.

- [ ] **Step 1: Create the design tokens**

`apps/web/src/styles/tokens.css`:
```css
:root {
  --color-primary: #0E7490;
  --color-primary-hover: #0C607A;
  --color-on-primary: #FFFFFF;
  --color-text: #0F172A;
  --color-text-secondary: #5B7280;
  --color-border: #E2E8F0;
  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-success: #15803D;
  --color-error: #DC2626;
  --color-warning: #B45309;

  --radius-sm: 6px;
  --radius-md: 10px;

  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.10);
  --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;
}
```

- [ ] **Step 2: Create global base styles**

`apps/web/src/styles/global.css`:
```css
* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--color-bg);
  font-size: var(--text-base);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--color-primary); text-decoration: none; }
a:hover { text-decoration: underline; }

h1, h2, h3 { color: var(--color-text); line-height: 1.25; margin: 0 0 var(--space-4); }

:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Wire the CSS into main.tsx**

Edit `apps/web/src/main.tsx` — replace the existing `import './index.css'` (if present) with the two style imports at the top (keep everything else):
```typescript
import "./styles/tokens.css";
import "./styles/global.css";
```

- [ ] **Step 4: Write the failing Button test**

`apps/web/src/components/ui/Button.test.tsx`:
```typescript
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

test("renders a button with its label and fires onClick", async () => {
  const { getByRole } = render(<Button>Salvar</Button>);
  expect(getByRole("button", { name: "Salvar" })).toBeInTheDocument();
});

test("respects the disabled attribute", () => {
  render(<Button disabled>Enviar</Button>);
  expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run (from `apps/web`): `npm test -- Button`
Expected: FAIL (cannot find `./Button`).

- [ ] **Step 6: Implement Button**

`apps/web/src/components/ui/Button.module.css`:
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.btn:disabled { opacity: 0.55; cursor: not-allowed; }

.primary { background: var(--color-primary); color: var(--color-on-primary); }
.primary:hover:not(:disabled) { background: var(--color-primary-hover); }

.secondary { background: var(--color-surface); color: var(--color-text); border-color: var(--color-border); }
.secondary:hover:not(:disabled) { background: var(--color-bg); }

.ghost { background: transparent; color: var(--color-primary); }
.ghost:hover:not(:disabled) { background: rgba(14, 116, 144, 0.08); }
```

`apps/web/src/components/ui/Button.tsx`:
```typescript
import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ variant = "primary", className, ...rest }: Props) {
  const cls = [styles.btn, styles[variant], className].filter(Boolean).join(" ");
  return <button className={cls} {...rest} />;
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- Button`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/styles apps/web/src/components/ui/Button.* apps/web/src/main.tsx
git commit -m "feat(web): add design tokens, global styles, and Button primitive"
```

---

### Task 2: Field, Card, and Alert primitives

**Files:**
- Create: `apps/web/src/components/ui/Field.tsx` (+ `.module.css`), `Card.tsx` (+ `.module.css`), `Alert.tsx` (+ `.module.css`)
- Test: `apps/web/src/components/ui/Field.test.tsx`, `apps/web/src/components/ui/Alert.test.tsx`

**Interfaces:**
- Produces: `Field({ label, error?, ...inputProps })` — labeled input, associates label+input via id, shows error text; `Card({ children, className? })`; `Alert({ variant?: "error"|"success"|"warning", children })`.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/components/ui/Field.test.tsx`:
```typescript
import { render, screen } from "@testing-library/react";
import { Field } from "./Field";

test("associates the label with the input and shows the error", () => {
  render(<Field label="E-mail" error="Obrigatório" name="email" />);
  const input = screen.getByLabelText("E-mail");
  expect(input).toBeInTheDocument();
  expect(screen.getByText("Obrigatório")).toBeInTheDocument();
});
```

`apps/web/src/components/ui/Alert.test.tsx`:
```typescript
import { render, screen } from "@testing-library/react";
import { Alert } from "./Alert";

test("renders its message with an alert role", () => {
  render(<Alert variant="error">Falha ao entrar</Alert>);
  expect(screen.getByRole("alert")).toHaveTextContent("Falha ao entrar");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- ui/`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement Field**

`apps/web/src/components/ui/Field.module.css`:
```css
.field { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4); }
.label { font-size: var(--text-sm); font-weight: 600; color: var(--color-text); }
.input {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font: inherit;
  background: var(--color-surface);
  color: var(--color-text);
}
.input:focus-visible { border-color: var(--color-primary); outline: none; box-shadow: 0 0 0 3px rgba(14,116,144,0.15); }
.error { color: var(--color-error); font-size: var(--text-sm); }
```

`apps/web/src/components/ui/Field.tsx`:
```typescript
import type { InputHTMLAttributes } from "react";
import { useId } from "react";
import styles from "./Field.module.css";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Field({ label, error, id, ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>{label}</label>
      <input className={styles.input} id={inputId} {...rest} />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Implement Card**

`apps/web/src/components/ui/Card.module.css`:
```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: var(--space-6);
}
```

`apps/web/src/components/ui/Card.tsx`:
```typescript
import type { HTMLAttributes } from "react";
import styles from "./Card.module.css";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={[styles.card, className].filter(Boolean).join(" ")} {...rest} />;
}
```

- [ ] **Step 5: Implement Alert**

`apps/web/src/components/ui/Alert.module.css`:
```css
.alert { padding: var(--space-3) var(--space-4); border-radius: var(--radius-sm); font-size: var(--text-sm); border: 1px solid transparent; }
.error { background: #FEF2F2; color: var(--color-error); border-color: #FECACA; }
.success { background: #F0FDF4; color: var(--color-success); border-color: #BBF7D0; }
.warning { background: #FFFBEB; color: var(--color-warning); border-color: #FDE68A; }
```

`apps/web/src/components/ui/Alert.tsx`:
```typescript
import type { ReactNode } from "react";
import styles from "./Alert.module.css";

export function Alert({ variant = "error", children }: { variant?: "error" | "success" | "warning"; children: ReactNode }) {
  return <div role="alert" className={[styles.alert, styles[variant]].join(" ")}>{children}</div>;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- ui/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/ui
git commit -m "feat(web): add Field, Card, and Alert primitives"
```

---

### Task 3: Token-aware API client + auth API

**Files:**
- Modify: `apps/web/src/lib/api.ts`
- Test: `apps/web/src/lib/api.test.ts`

**Interfaces:**
- Produces: `setAuthToken(token: string | null)`, `getAuthToken(): string | null` (backed by `localStorage["petconnect_token"]`); `apiFetch` attaches `Authorization: Bearer <token>` when a token is set; `authApi = { register(body), login(body), me() }` returning typed results. Types: `AuthUser = { id: number; name: string; email: string; org_id: number }`, `TokenResponse = { access_token: string; token_type: string }`.
- Consumes: existing `apiFetch` pattern.

- [ ] **Step 1: Write the failing test**

`apps/web/src/lib/api.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/api`
Expected: FAIL (`setAuthToken` not exported).

- [ ] **Step 3: Implement the token-aware client**

Replace `apps/web/src/lib/api.ts`:
```typescript
const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const TOKEN_KEY = "petconnect_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers({ "Content-Type": "application/json", ...init.headers });
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const resp = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!resp.ok) {
    let detail = `Request failed: ${resp.status}`;
    try {
      const body = await resp.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(detail);
  }
  return resp.json() as Promise<T>;
}

export type AuthUser = { id: number; name: string; email: string; org_id: number };
export type TokenResponse = { access_token: string; token_type: string };

export type RegisterBody = {
  org_name: string;
  city?: string;
  name: string;
  email: string;
  password: string;
};
export type LoginBody = { email: string; password: string };

export const authApi = {
  register: (body: RegisterBody) =>
    apiFetch<TokenResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: LoginBody) =>
    apiFetch<TokenResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => apiFetch<AuthUser>("/api/auth/me"),
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- lib/api`
Expected: PASS (2 tests). The pre-existing `App.test.tsx` must still pass — run `npm test` once.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/lib/api.test.ts
git commit -m "feat(web): add token-aware apiFetch and auth API client"
```

---

### Task 4: AuthContext + ProtectedRoute

**Files:**
- Create: `apps/web/src/auth/AuthContext.tsx`, `apps/web/src/auth/ProtectedRoute.tsx`
- Test: `apps/web/src/auth/AuthContext.test.tsx`

**Interfaces:**
- Produces: `AuthProvider` (hydrates user from `/me` if a token exists), `useAuth() => { user: AuthUser | null; loading: boolean; login(body); register(body); logout() }`. `ProtectedRoute` renders `<Outlet/>` when authenticated, else `<Navigate to="/login" />`. On login/register it stores the token (`setAuthToken`) and loads the user; logout clears both.
- Consumes: `authApi`, `setAuthToken`, `getAuthToken`, `AuthUser` (Task 3); `react-router-dom` (`Navigate`, `Outlet`).

- [ ] **Step 1: Install react-router-dom**

Run (from `apps/web`): `npm install react-router-dom`

- [ ] **Step 2: Write the failing test**

`apps/web/src/auth/AuthContext.test.tsx`:
```typescript
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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- AuthContext`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement AuthContext**

`apps/web/src/auth/AuthContext.tsx`:
```typescript
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { authApi, getAuthToken, setAuthToken } from "../lib/api";
import type { AuthUser, LoginBody, RegisterBody } from "../lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (body: LoginBody) => Promise<void>;
  register: (body: RegisterBody) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => setAuthToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function afterToken(token: string) {
    setAuthToken(token);
    setUser(await authApi.me());
  }

  async function login(body: LoginBody) {
    const { access_token } = await authApi.login(body);
    await afterToken(access_token);
  }

  async function register(body: RegisterBody) {
    const { access_token } = await authApi.register(body);
    await afterToken(access_token);
  }

  function logout() {
    setAuthToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 5: Implement ProtectedRoute**

`apps/web/src/auth/ProtectedRoute.tsx`:
```typescript
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <p style={{ padding: "var(--space-8)" }}>Carregando…</p>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- AuthContext`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/auth apps/web/package.json apps/web/package-lock.json
git commit -m "feat(web): add AuthContext and ProtectedRoute"
```

---

### Task 5: Public and Admin layouts

**Files:**
- Create: `apps/web/src/layouts/PublicLayout.tsx` (+ `.module.css`), `apps/web/src/layouts/AdminLayout.tsx` (+ `.module.css`)
- Test: `apps/web/src/layouts/AdminLayout.test.tsx`

**Interfaces:**
- Produces: `PublicLayout` (brand header with a link to `/` and an "Área da ONG" link to `/login`, then `<Outlet/>`); `AdminLayout` (sidebar with brand + nav links to `/admin` and a "Sair" button calling `logout()`, top area renders `<Outlet/>`; shows the logged-in user's name).
- Consumes: `useAuth` (Task 4); `react-router-dom` (`Link`, `Outlet`, `useNavigate`).

- [ ] **Step 1: Write the failing test**

`apps/web/src/layouts/AdminLayout.test.tsx`:
```typescript
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { AdminLayout } from "./AdminLayout";
import * as auth from "../auth/AuthContext";

test("renders the brand and the logged-in user's name", () => {
  vi.spyOn(auth, "useAuth").mockReturnValue({
    user: { id: 1, name: "Ana", email: "ana@x.org", org_id: 1 },
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  });
  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<p>painel</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText("PetConnect")).toBeInTheDocument();
  expect(screen.getByText("Ana")).toBeInTheDocument();
  expect(screen.getByText("painel")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- AdminLayout`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement PublicLayout**

`apps/web/src/layouts/PublicLayout.module.css`:
```css
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.brand { font-size: var(--text-lg); font-weight: 700; color: var(--color-primary); }
.main { max-width: 1100px; margin: 0 auto; padding: var(--space-8) var(--space-6); }
```

`apps/web/src/layouts/PublicLayout.tsx`:
```typescript
import { Link, Outlet } from "react-router-dom";
import styles from "./PublicLayout.module.css";

export function PublicLayout() {
  return (
    <>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>PetConnect</Link>
        <Link to="/login">Área da ONG</Link>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  );
}
```

- [ ] **Step 4: Implement AdminLayout**

`apps/web/src/layouts/AdminLayout.module.css`:
```css
.shell { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
.sidebar {
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: var(--space-6) var(--space-4);
  display: flex; flex-direction: column; gap: var(--space-4);
}
.brand { font-size: var(--text-lg); font-weight: 700; color: var(--color-primary); }
.nav { display: flex; flex-direction: column; gap: var(--space-2); }
.nav a { color: var(--color-text); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); }
.nav a:hover { background: var(--color-bg); text-decoration: none; }
.footer { margin-top: auto; display: flex; flex-direction: column; gap: var(--space-2); }
.user { font-size: var(--text-sm); color: var(--color-text-secondary); }
.content { padding: var(--space-8); }
```

`apps/web/src/layouts/AdminLayout.tsx`:
```typescript
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import styles from "./AdminLayout.module.css";

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <span className={styles.brand}>PetConnect</span>
        <nav className={styles.nav}>
          <Link to="/admin">Painel</Link>
        </nav>
        <div className={styles.footer}>
          {user && <span className={styles.user}>{user.name}</span>}
          <Button variant="secondary" onClick={handleLogout}>Sair</Button>
        </div>
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- AdminLayout`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/layouts
git commit -m "feat(web): add public and admin layouts"
```

---

### Task 6: Login & Register pages, route tree, and placeholders

**Files:**
- Create: `apps/web/src/pages/auth/LoginPage.tsx` (+ `.module.css` shared), `apps/web/src/pages/auth/RegisterPage.tsx`
- Create: `apps/web/src/pages/auth/authForm.module.css`
- Create: `apps/web/src/pages/public/HomePage.tsx`, `apps/web/src/pages/admin/DashboardPage.tsx`
- Modify: `apps/web/src/App.tsx`, `apps/web/src/main.tsx`
- Test: `apps/web/src/pages/auth/LoginPage.test.tsx`

**Interfaces:**
- Produces: `LoginPage` and `RegisterPage` (forms using `Field`/`Button`/`Alert`/`Card`, call `useAuth().login/register`, on success `navigate("/admin")`, on failure show the error message); `HomePage`, `DashboardPage` placeholders; the full route tree in `App.tsx`; `main.tsx` wraps `<App/>` in `BrowserRouter` + `AuthProvider`.
- Consumes: all prior tasks; `react-router-dom` (`useNavigate`, `Link`, `BrowserRouter`, `Routes`, `Route`).

- [ ] **Step 1: Write the failing test**

`apps/web/src/pages/auth/LoginPage.test.tsx`:
```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { LoginPage } from "./LoginPage";
import * as auth from "../../auth/AuthContext";

function setup(login: () => Promise<void>) {
  vi.spyOn(auth, "useAuth").mockReturnValue({
    user: null, loading: false, login, register: vi.fn(), logout: vi.fn(),
  });
  render(<MemoryRouter><LoginPage /></MemoryRouter>);
}

test("submits email and password to login", async () => {
  const login = vi.fn().mockResolvedValue(undefined);
  setup(login);
  await userEvent.type(screen.getByLabelText("E-mail"), "ana@x.org");
  await userEvent.type(screen.getByLabelText("Senha"), "s3cret!");
  await userEvent.click(screen.getByRole("button", { name: /entrar/i }));
  expect(login).toHaveBeenCalledWith({ email: "ana@x.org", password: "s3cret!" });
});

test("shows an error message when login fails", async () => {
  setup(vi.fn().mockRejectedValue(new Error("Credenciais inválidas")));
  await userEvent.type(screen.getByLabelText("E-mail"), "ana@x.org");
  await userEvent.type(screen.getByLabelText("Senha"), "wrong");
  await userEvent.click(screen.getByRole("button", { name: /entrar/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Credenciais inválidas");
});
```

- [ ] **Step 2: Install @testing-library/user-event and run the test to verify it fails**

Run (from `apps/web`): `npm install -D @testing-library/user-event`
Run: `npm test -- LoginPage`
Expected: FAIL (module not found).

- [ ] **Step 3: Create the shared auth-form styles**

`apps/web/src/pages/auth/authForm.module.css`:
```css
.wrap { max-width: 420px; margin: var(--space-8) auto; }
.title { font-size: var(--text-xl); }
.switch { margin-top: var(--space-4); font-size: var(--text-sm); color: var(--color-text-secondary); }
.actions { margin-top: var(--space-2); }
.full { width: 100%; }
```

- [ ] **Step 4: Implement LoginPage**

`apps/web/src/pages/auth/LoginPage.tsx`:
```typescript
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import styles from "./authForm.module.css";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <Card>
        <h1 className={styles.title}>Entrar</h1>
        <form onSubmit={onSubmit}>
          {error && <Alert variant="error">{error}</Alert>}
          <Field label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Field label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div className={styles.actions}>
            <Button type="submit" className={styles.full} disabled={submitting}>
              {submitting ? "Entrando…" : "Entrar"}
            </Button>
          </div>
        </form>
        <p className={styles.switch}>
          Ainda não tem conta? <Link to="/registrar">Cadastre sua ONG</Link>
        </p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Implement RegisterPage**

`apps/web/src/pages/auth/RegisterPage.tsx`:
```typescript
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import styles from "./authForm.module.css";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ org_name: "", city: "", name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ ...form, city: form.city || undefined });
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <Card>
        <h1 className={styles.title}>Cadastrar ONG</h1>
        <form onSubmit={onSubmit}>
          {error && <Alert variant="error">{error}</Alert>}
          <Field label="Nome da ONG" value={form.org_name} onChange={update("org_name")} required />
          <Field label="Cidade" value={form.city} onChange={update("city")} />
          <Field label="Seu nome" value={form.name} onChange={update("name")} required />
          <Field label="E-mail" type="email" value={form.email} onChange={update("email")} required />
          <Field label="Senha" type="password" value={form.password} onChange={update("password")} required />
          <div className={styles.actions}>
            <Button type="submit" className={styles.full} disabled={submitting}>
              {submitting ? "Cadastrando…" : "Cadastrar"}
            </Button>
          </div>
        </form>
        <p className={styles.switch}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Implement the placeholder pages**

`apps/web/src/pages/public/HomePage.tsx`:
```typescript
export function HomePage() {
  return (
    <section>
      <h1>Adote um amigo</h1>
      <p>A vitrine de animais para adoção estará disponível aqui em breve.</p>
    </section>
  );
}
```

`apps/web/src/pages/admin/DashboardPage.tsx`:
```typescript
import { useAuth } from "../../auth/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();
  return (
    <section>
      <h1>Painel</h1>
      <p>Bem-vindo(a), {user?.name}. O dashboard com alertas chega nas próximas etapas.</p>
    </section>
  );
}
```

- [ ] **Step 7: Declare the route tree**

Replace `apps/web/src/App.tsx`:
```typescript
import { Routes, Route } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { HomePage } from "./pages/public/HomePage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { DashboardPage } from "./pages/admin/DashboardPage";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registrar" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<DashboardPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 8: Wrap the app in BrowserRouter + AuthProvider**

Edit `apps/web/src/main.tsx` — wrap `<App />` so the render call is:
```typescript
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
// ...existing imports (tokens.css, global.css, React, ReactDOM, App)...

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
```
(Keep the existing `StrictMode`/`createRoot` imports; only add `BrowserRouter` and `AuthProvider` wrappers.)

- [ ] **Step 9: Update the existing App smoke test**

The old `apps/web/src/App.test.tsx` renders `<App/>` bare; it now needs router + auth context and asserts routed content. Replace it:
```typescript
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import App from "./App";

test("renders the public home at /", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading", { name: /adote um amigo/i })).toBeInTheDocument();
});
```

- [ ] **Step 10: Run the full frontend suite**

Run: `npm test`
Expected: PASS (all: Button, ui primitives, api, AuthContext, AdminLayout, LoginPage, App).

- [ ] **Step 11: Build to verify types and production bundle**

Run: `npm run build`
Expected: `tsc` + Vite build succeed with no type errors.

- [ ] **Step 12: Commit**

```bash
git add apps/web/src apps/web/package.json apps/web/package-lock.json
git commit -m "feat(web): add login/register pages, routing, layouts, and placeholders"
```

---

## Definition of Done

- `npm test` and `npm run build` pass in `apps/web`.
- Visiting `/` shows the public layout + home placeholder; `/login` and `/registrar` render themed forms.
- Registering an ONG or logging in stores the JWT, hydrates the user, and lands on `/admin` inside the admin layout; `/admin` is unreachable when logged out (redirects to `/login`); "Sair" logs out.
- All screens use the teal light-mode design tokens; no dark-mode code.
