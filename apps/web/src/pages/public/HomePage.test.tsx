import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi, beforeEach } from "vitest";
import { HomePage } from "./HomePage";
import { publicApi } from "../../lib/publicApi";

beforeEach(() => {
  vi.spyOn(publicApi, "listAnimals").mockResolvedValue([
    {
      id: "33333333-3333-4333-8333-333333333333", name: "Thor", species: "cão", breed: null, sex: "macho", size: "M",
      birth_estimate: null, description: null, photo_url: null, org_id: "22222222-2222-4222-8222-222222222222",
      org_name: "Abrigo Amigo Fiel", org_city: "João Pessoa", org_slug: "abrigo-amigo-fiel",
    },
  ]);
});

test("renders animal cards from the API", async () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  expect(await screen.findByText("Thor")).toBeInTheDocument();
  expect(screen.getByText(/Abrigo Amigo Fiel/)).toBeInTheDocument();
});

test("filtro de Espécie: escolher uma espécie filtra, escolher 'Todas' remove o filtro sem reter a sentinela", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  await screen.findByText("Thor");

  await user.click(screen.getByLabelText("Espécie"));
  await user.click(await screen.findByRole("option", { name: "Gato" }));

  await waitFor(() => {
    expect(publicApi.listAnimals).toHaveBeenLastCalledWith({ species: "gato" });
  });

  await user.click(screen.getByLabelText("Espécie"));
  await user.click(await screen.findByRole("option", { name: "Todas" }));

  await waitFor(() => {
    const lastCall = vi.mocked(publicApi.listAnimals).mock.calls.at(-1)?.[0];
    expect(lastCall?.species).toBeUndefined();
  });
  expect(publicApi.listAnimals).toHaveBeenLastCalledWith({});
});
