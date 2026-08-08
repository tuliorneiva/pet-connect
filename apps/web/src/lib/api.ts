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
  const headers = new Headers(init.headers);
  // Em multipart o Content-Type carrega o boundary que só o navegador sabe gerar;
  // fixá-lo em JSON faria o servidor recusar o corpo.
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
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
  // 204 não tem corpo; chamar .json() aqui estouraria.
  if (resp.status === 204) return undefined as T;
  return resp.json() as Promise<T>;
}

export type AuthUser = { id: string; name: string; email: string; org_id: string };
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
