import { render, screen, waitFor } from "@testing-library/react";
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
