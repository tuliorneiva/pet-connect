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
