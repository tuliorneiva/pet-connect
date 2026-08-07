import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { AnimalFormPage } from "./AnimalFormPage";
import { adminApi } from "../../lib/adminApi";
import type { Animal } from "../../lib/types";

const BASE_ANIMAL: Animal = {
  id: "33333333-3333-4333-8333-333333333333",
  org_id: "22222222-2222-4222-8222-222222222222",
  name: "Rex",
  species: "cão",
  breed: null,
  sex: "macho",
  size: "P",
  birth_estimate: null,
  description: null,
  photo_url: null,
  photos: [],
  photo_items: [],
  status: "disponível",
  created_at: "2026-01-01T00:00:00Z",
};

test("novo animal com Sexo e Porte em branco: grava sex e size como null, nunca a sentinela", async () => {
  const user = userEvent.setup();
  const createSpy = vi.spyOn(adminApi, "createAnimal").mockResolvedValue(BASE_ANIMAL);

  render(
    <MemoryRouter initialEntries={["/admin/animais/novo"]}>
      <Routes>
        <Route path="/admin/animais/novo" element={<AnimalFormPage />} />
        <Route path="/admin/animais" element={<p>lista de animais</p>} />
      </Routes>
    </MemoryRouter>,
  );

  await user.type(screen.getByLabelText("Nome"), "Fido");
  // Sexo e Porte ficam no valor padrão (sentinela "—" exibida no trigger).
  expect(screen.getByLabelText("Sexo")).toHaveTextContent("—");
  expect(screen.getByLabelText("Porte")).toHaveTextContent("—");

  await user.click(screen.getByRole("button", { name: "Salvar" }));

  await waitFor(() => expect(createSpy).toHaveBeenCalled());
  const payload = createSpy.mock.calls[0][0];
  expect(payload.sex).toBeNull();
  expect(payload.size).toBeNull();
  // a sentinela nunca deve escapar para a API como se fosse um valor de verdade
  expect(JSON.stringify(payload)).not.toContain("—");
});

test("editar animal com Sexo preenchido e limpá-lo grava null, não mantém o valor antigo", async () => {
  const user = userEvent.setup();
  vi.spyOn(adminApi, "getAnimal").mockResolvedValue(BASE_ANIMAL);
  const updateSpy = vi.spyOn(adminApi, "updateAnimal").mockResolvedValue(BASE_ANIMAL);

  render(
    <MemoryRouter initialEntries={[`/admin/animais/${BASE_ANIMAL.id}/editar`]}>
      <Routes>
        <Route path="/admin/animais/:id/editar" element={<AnimalFormPage />} />
        <Route path="/admin/animais" element={<p>lista de animais</p>} />
      </Routes>
    </MemoryRouter>,
  );

  // aguarda o formulário carregar os dados do animal (sex: "macho")
  expect(await screen.findByLabelText("Sexo")).toHaveTextContent("Macho");

  await user.click(screen.getByLabelText("Sexo"));
  await user.click(await screen.findByRole("option", { name: "—" }));
  expect(screen.getByLabelText("Sexo")).toHaveTextContent("—");

  await user.click(screen.getByRole("button", { name: "Salvar" }));

  await waitFor(() => expect(updateSpy).toHaveBeenCalled());
  const [, payload] = updateSpy.mock.calls[0];
  expect(payload.sex).toBeNull();
  expect(payload.sex).not.toBe("macho");
  expect(payload.sex).not.toBe("—");
});

test("as ações ficam no cabeçalho, não no rodapé do formulário", async () => {
  vi.spyOn(adminApi, "getAnimal").mockResolvedValue(BASE_ANIMAL);
  render(
    <MemoryRouter initialEntries={[`/admin/animais/${BASE_ANIMAL.id}/editar`]}>
      <Routes>
        <Route path="/admin/animais/:id/editar" element={<AnimalFormPage />} />
      </Routes>
    </MemoryRouter>,
  );

  const header = await screen.findByTestId("form-header");
  expect(within(header).getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  expect(within(header).getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
});

test("não existe mais campo de URL de foto", async () => {
  render(
    <MemoryRouter initialEntries={["/admin/animais/novo"]}>
      <Routes>
        <Route path="/admin/animais/novo" element={<AnimalFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.queryByLabelText(/foto \(url\)/i)).not.toBeInTheDocument();
  expect(screen.getByLabelText("Adicionar foto")).toBeInTheDocument();
});

test("descrição é um textarea, não um input de uma linha", async () => {
  render(
    <MemoryRouter initialEntries={["/admin/animais/novo"]}>
      <Routes>
        <Route path="/admin/animais/novo" element={<AnimalFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByLabelText("Descrição").tagName).toBe("TEXTAREA");
});

test("criar animal com fotos: cria primeiro, depois sobe as fotos com o id em mãos", async () => {
  const user = userEvent.setup();
  const createSpy = vi.spyOn(adminApi, "createAnimal").mockResolvedValue(BASE_ANIMAL);
  const uploadSpy = vi
    .spyOn(adminApi, "uploadPhoto")
    .mockResolvedValue({ id: "p1", url: "https://cdn/a.jpg", sort_order: 0 });

  render(
    <MemoryRouter initialEntries={["/admin/animais/novo"]}>
      <Routes>
        <Route path="/admin/animais/novo" element={<AnimalFormPage />} />
        <Route path="/admin/animais" element={<p>lista de animais</p>} />
      </Routes>
    </MemoryRouter>,
  );

  await user.type(screen.getByLabelText("Nome"), "Fido");
  await user.upload(
    screen.getByLabelText("Adicionar foto"),
    new File(["a"], "a.jpg", { type: "image/jpeg" }),
  );
  await screen.findByTestId("photo-slot");

  await user.click(screen.getByRole("button", { name: "Salvar" }));

  await waitFor(() => expect(uploadSpy).toHaveBeenCalled());
  expect(createSpy).toHaveBeenCalled();
  expect(uploadSpy.mock.calls[0][0]).toBe(BASE_ANIMAL.id);
  // ordem importa: sem o id do animal não há para onde subir a foto
  expect(createSpy.mock.invocationCallOrder[0]).toBeLessThan(
    uploadSpy.mock.invocationCallOrder[0],
  );
});

test("falha no upload não desfaz o animal e oferece tentar de novo", async () => {
  const user = userEvent.setup();
  const deleteSpy = vi.spyOn(adminApi, "deleteAnimal").mockResolvedValue(undefined);
  vi.spyOn(adminApi, "createAnimal").mockResolvedValue(BASE_ANIMAL);
  vi.spyOn(adminApi, "getAnimal").mockResolvedValue(BASE_ANIMAL);
  const uploadSpy = vi
    .spyOn(adminApi, "uploadPhoto")
    .mockRejectedValueOnce(new Error("Cada foto precisa ter no máximo 1 MB."));

  render(
    <MemoryRouter initialEntries={["/admin/animais/novo"]}>
      <Routes>
        <Route path="/admin/animais/novo" element={<AnimalFormPage />} />
        <Route path="/admin/animais" element={<p>lista de animais</p>} />
      </Routes>
    </MemoryRouter>,
  );

  await user.type(screen.getByLabelText("Nome"), "Fido");
  await user.upload(
    screen.getByLabelText("Adicionar foto"),
    new File(["a"], "a.jpg", { type: "image/jpeg" }),
  );
  await screen.findByTestId("photo-slot");
  await user.click(screen.getByRole("button", { name: "Salvar" }));

  const alerta = await screen.findByRole("alert");
  expect(alerta).toHaveTextContent("1 foto não subiu");
  // o animal continua de pé
  expect(deleteSpy).not.toHaveBeenCalled();
  // e ainda estamos no formulário, não na lista
  expect(screen.queryByText("lista de animais")).not.toBeInTheDocument();

  uploadSpy.mockResolvedValueOnce({ id: "p1", url: "https://cdn/a.jpg", sort_order: 0 });
  await user.click(screen.getByRole("button", { name: /tentar novamente/i }));

  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
});

test("editar animal existente: remover foto chama a API na hora", async () => {
  const user = userEvent.setup();
  vi.spyOn(adminApi, "getAnimal").mockResolvedValue({
    ...BASE_ANIMAL,
    photos: ["https://cdn/a.jpg"],
    photo_url: "https://cdn/a.jpg",
    // O botão "remover foto" só existe com o id da foto em mãos — photos (string[])
    // não basta, o formulário lê de photo_items (ver nota "Sobre os ids das fotos").
    photo_items: [{ id: "p1", url: "https://cdn/a.jpg", sort_order: 0 }],
  });
  const deletePhotoSpy = vi.spyOn(adminApi, "deletePhoto").mockResolvedValue(undefined);

  render(
    <MemoryRouter initialEntries={[`/admin/animais/${BASE_ANIMAL.id}/editar`]}>
      <Routes>
        <Route path="/admin/animais/:id/editar" element={<AnimalFormPage />} />
      </Routes>
    </MemoryRouter>,
  );

  await user.click(await screen.findByRole("button", { name: /remover foto/i }));

  await waitFor(() => expect(deletePhotoSpy).toHaveBeenCalled());
});

test("erro de upload vindo da API aparece na tela, sem derrubar o formulário", async () => {
  const user = userEvent.setup();
  vi.spyOn(adminApi, "getAnimal").mockResolvedValue(BASE_ANIMAL);
  vi.spyOn(adminApi, "uploadPhoto").mockRejectedValue(
    new Error("Cada foto precisa ter no máximo 1 MB."),
  );

  render(
    <MemoryRouter initialEntries={[`/admin/animais/${BASE_ANIMAL.id}/editar`]}>
      <Routes>
        <Route path="/admin/animais/:id/editar" element={<AnimalFormPage />} />
      </Routes>
    </MemoryRouter>,
  );

  await user.upload(
    await screen.findByLabelText("Adicionar foto"),
    new File(["a"], "a.jpg", { type: "image/jpeg" }),
  );

  expect(await screen.findByRole("alert")).toHaveTextContent("no máximo 1 MB");
  // o resto do formulário continua utilizável
  expect(screen.getByLabelText("Nome")).toHaveValue("Rex");
});
