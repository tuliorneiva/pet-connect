import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { OrgProfilePage } from "./OrgProfilePage";
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
  created_at: "2026-01-01T00:00:00Z",
};

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/admin/perfil"]}>
      <Routes>
        <Route path="/admin/perfil" element={<OrgProfilePage />} />
        <Route path="/admin" element={<p>painel</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

test("carrega e mostra os dados atuais da ONG", async () => {
  vi.spyOn(adminApi, "getOrganization").mockResolvedValue({ ...BASE_ORG });
  renderPage();

  expect(await screen.findByDisplayValue("Abrigo Amigo Fiel")).toBeInTheDocument();
  expect(screen.getByDisplayValue("João Pessoa")).toBeInTheDocument();
  expect(screen.getByText(/ongs\/abrigo-amigo-fiel/)).toBeInTheDocument();
});

test("selo de verificado só aparece quando a ONG é verificada", async () => {
  vi.spyOn(adminApi, "getOrganization").mockResolvedValue({ ...BASE_ORG, verified: true });
  renderPage();

  expect(await screen.findByText("Verificada pela plataforma")).toBeInTheDocument();
});

test("slug e selo não têm campo editável", async () => {
  vi.spyOn(adminApi, "getOrganization").mockResolvedValue({ ...BASE_ORG });
  renderPage();

  await screen.findByDisplayValue("Abrigo Amigo Fiel");
  expect(screen.queryByLabelText(/endereço público/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/verificad/i)).not.toBeInTheDocument();
});

test("salvar envia só os campos do formulário e volta para o painel", async () => {
  const user = userEvent.setup();
  vi.spyOn(adminApi, "getOrganization").mockResolvedValue({ ...BASE_ORG });
  const updateSpy = vi.spyOn(adminApi, "updateOrganization").mockResolvedValue(BASE_ORG);
  renderPage();

  await screen.findByDisplayValue("Abrigo Amigo Fiel");
  await user.type(screen.getByLabelText("Telefone"), "(83) 90000-0000");
  await user.type(screen.getByLabelText("Ano de fundação"), "2019");
  await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

  await waitFor(() => expect(updateSpy).toHaveBeenCalled());
  const payload = updateSpy.mock.calls.at(-1)![0];
  expect(payload.phone).toBe("(83) 90000-0000");
  expect(payload.founded_year).toBe(2019);
  expect(await screen.findByText("painel")).toBeInTheDocument();
});

test("campo opcional deixado em branco é salvo como null, não string vazia", async () => {
  const user = userEvent.setup();
  vi.spyOn(adminApi, "getOrganization").mockResolvedValue({ ...BASE_ORG });
  const updateSpy = vi.spyOn(adminApi, "updateOrganization").mockResolvedValue(BASE_ORG);
  renderPage();

  await screen.findByDisplayValue("Abrigo Amigo Fiel");
  await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

  await waitFor(() => expect(updateSpy).toHaveBeenCalled());
  // .at(-1): vi.spyOn no mesmo método em vários testes do arquivo reaproveita o
  // mesmo mock, então o histórico de chamadas acumula — [0] pegaria a de outro teste.
  const payload = updateSpy.mock.calls.at(-1)![0];
  expect(payload.phone).toBeNull();
  expect(payload.description).toBeNull();
});

test("erro ao salvar aparece na tela e não navega para o painel", async () => {
  const user = userEvent.setup();
  vi.spyOn(adminApi, "getOrganization").mockResolvedValue({ ...BASE_ORG });
  vi.spyOn(adminApi, "updateOrganization").mockRejectedValue(new Error("Nome inválido"));
  renderPage();

  await screen.findByDisplayValue("Abrigo Amigo Fiel");
  await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Nome inválido");
  expect(screen.queryByText("painel")).not.toBeInTheDocument();
});

test("enviar logo chama a API e mostra a imagem enviada", async () => {
  const user = userEvent.setup();
  vi.spyOn(adminApi, "getOrganization").mockResolvedValue({ ...BASE_ORG });
  const uploadSpy = vi
    .spyOn(adminApi, "uploadLogo")
    .mockResolvedValue({ ...BASE_ORG, logo_url: "https://cdn/logo.jpg" });
  renderPage();

  await screen.findByDisplayValue("Abrigo Amigo Fiel");
  await user.upload(
    screen.getByLabelText("Enviar logo"),
    new File(["a"], "logo.jpg", { type: "image/jpeg" }),
  );

  await waitFor(() => expect(uploadSpy).toHaveBeenCalled());
  expect(await screen.findByRole("button", { name: "Remover" })).toBeInTheDocument();
});

test("remover logo chama a API e volta a mostrar o placeholder", async () => {
  const user = userEvent.setup();
  vi.spyOn(adminApi, "getOrganization").mockResolvedValue({
    ...BASE_ORG,
    logo_url: "https://cdn/logo.jpg",
  });
  const deleteSpy = vi.spyOn(adminApi, "deleteLogo").mockResolvedValue(BASE_ORG);
  renderPage();

  const removeBtn = await screen.findByRole("button", { name: "Remover" });
  await user.click(removeBtn);

  await waitFor(() => expect(deleteSpy).toHaveBeenCalled());
  expect(screen.queryByRole("button", { name: "Remover" })).not.toBeInTheDocument();
});
