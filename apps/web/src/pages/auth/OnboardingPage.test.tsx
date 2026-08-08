import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { OnboardingPage } from "./OnboardingPage";
import * as auth from "../../auth/AuthContext";
import { adminApi } from "../../lib/adminApi";
import type { OrganizationProfile } from "../../lib/types";

const BASE_ORG: OrganizationProfile = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Abrigo Amigo Fiel",
  slug: "abrigo-amigo-fiel",
  city: "João Pessoa",
  description: null,
  email: null,
  phone: null,
  website: null,
  address: null,
  founded_year: null,
  verified: false,
  logo_url: null,
  whatsapp: null,
  instagram: null,
  facebook: null,
  pix_key: null,
  created_at: "2026-01-01T00:00:00Z",
};

function setup(register: () => Promise<void>) {
  vi.spyOn(auth, "useAuth").mockReturnValue({
    user: null, loading: false, login: vi.fn(), register, logout: vi.fn(),
  });
  render(
    <MemoryRouter initialEntries={["/registrar"]}>
      <Routes>
        <Route path="/registrar" element={<OnboardingPage />} />
        <Route path="/admin" element={<p>painel</p>} />
        <Route path="/admin/animais/novo" element={<p>novo animal</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillAccountStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nome da ONG"), "Abrigo Amigo Fiel");
  await user.type(screen.getByLabelText("Seu nome"), "Ana");
  await user.type(screen.getByLabelText("E-mail"), "ana@abrigo.org");
  await user.type(screen.getByLabelText("Senha"), "s3cret123");
  await user.click(screen.getByRole("button", { name: "Continuar" }));
}

test("passo 1: envia os dados da conta e avança para o passo 2 quando o cadastro funciona", async () => {
  const user = userEvent.setup();
  const register = vi.fn().mockResolvedValue(undefined);
  setup(register);

  await fillAccountStep(user);

  expect(register).toHaveBeenCalledWith(
    expect.objectContaining({ org_name: "Abrigo Amigo Fiel", name: "Ana", email: "ana@abrigo.org", password: "s3cret123" }),
  );
  expect(await screen.findByText("Complete o perfil da ONG")).toBeInTheDocument();
});

test("passo 1: erro no cadastro mostra alerta e não avança de passo", async () => {
  const user = userEvent.setup();
  setup(vi.fn().mockRejectedValue(new Error("Email já cadastrado")));

  await fillAccountStep(user);

  expect(await screen.findByRole("alert")).toHaveTextContent("Email já cadastrado");
  expect(screen.queryByText("Complete o perfil da ONG")).not.toBeInTheDocument();
});

test("passo 2: pular não chama a API de perfil e vai direto para o passo 3", async () => {
  const user = userEvent.setup();
  vi.spyOn(adminApi, "getOrganization").mockResolvedValue(BASE_ORG);
  const updateSpy = vi.spyOn(adminApi, "updateOrganization");
  setup(vi.fn().mockResolvedValue(undefined));

  await fillAccountStep(user);
  await screen.findByText("Complete o perfil da ONG");
  await user.click(screen.getByRole("button", { name: "Pular por enquanto" }));

  expect(await screen.findByText(/está no ar/)).toBeInTheDocument();
  expect(updateSpy).not.toHaveBeenCalled();
});

test("passo 2: salvar envia o perfil preenchido e avança para o passo 3", async () => {
  const user = userEvent.setup();
  const updateSpy = vi.spyOn(adminApi, "updateOrganization").mockResolvedValue(BASE_ORG);
  setup(vi.fn().mockResolvedValue(undefined));

  await fillAccountStep(user);
  await screen.findByText("Complete o perfil da ONG");
  await user.type(screen.getByLabelText("Telefone"), "(83) 90000-0000");
  await user.click(screen.getByRole("button", { name: "Salvar e continuar" }));

  await waitFor(() => expect(updateSpy).toHaveBeenCalled());
  expect(updateSpy.mock.calls.at(-1)![0]).toMatchObject({ phone: "(83) 90000-0000" });
  expect(await screen.findByText(/está no ar/)).toBeInTheDocument();
});

test("passo 3: escolher 'cadastrar meu primeiro animal' navega para o formulário de animal", async () => {
  const user = userEvent.setup();
  vi.spyOn(adminApi, "getOrganization").mockResolvedValue(BASE_ORG);
  setup(vi.fn().mockResolvedValue(undefined));

  await fillAccountStep(user);
  await screen.findByText("Complete o perfil da ONG");
  await user.click(screen.getByRole("button", { name: "Pular por enquanto" }));
  await screen.findByText(/está no ar/);
  await user.click(screen.getByRole("button", { name: /cadastrar meu primeiro animal/i }));

  expect(await screen.findByText("novo animal")).toBeInTheDocument();
});

test("passo 3: escolher 'ir para o painel' navega para o painel", async () => {
  const user = userEvent.setup();
  vi.spyOn(adminApi, "getOrganization").mockResolvedValue(BASE_ORG);
  setup(vi.fn().mockResolvedValue(undefined));

  await fillAccountStep(user);
  await screen.findByText("Complete o perfil da ONG");
  await user.click(screen.getByRole("button", { name: "Pular por enquanto" }));
  await screen.findByText(/está no ar/);
  await user.click(screen.getByRole("button", { name: /ir para o painel/i }));

  expect(await screen.findByText("painel")).toBeInTheDocument();
});
