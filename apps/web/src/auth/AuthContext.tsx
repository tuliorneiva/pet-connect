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
