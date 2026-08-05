import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { RelatedAnimals } from "./RelatedAnimals";
import { publicApi } from "@/lib/publicApi";
import type { PublicAnimal } from "@/lib/types";

const ORG_SLUG = "abrigo-amigo-fiel";
const ORG_NAME = "Abrigo Amigo Fiel";
const CURRENT_ID = "00000000-0000-4000-8000-000000000000";

function animal(id: string, name: string): PublicAnimal {
  return {
    id,
    name,
    species: "cão",
    breed: null,
    sex: "macho",
    size: "M",
    birth_estimate: null,
    description: null,
    photo_url: null,
    org_id: "22222222-2222-4222-8222-222222222222",
    org_name: ORG_NAME,
    org_city: "João Pessoa",
    org_slug: ORG_SLUG,
  };
}

function renderRelated() {
  return render(
    <MemoryRouter>
      <RelatedAnimals orgSlug={ORG_SLUG} orgName={ORG_NAME} excludeId={CURRENT_ID} />
    </MemoryRouter>,
  );
}

test("exclui o animal atual da lista", async () => {
  vi.spyOn(publicApi, "listAnimals").mockResolvedValue([
    animal(CURRENT_ID, "Mel"),
    animal("11111111-1111-4111-8111-111111111111", "Thor"),
    animal("22222222-2222-4222-8222-222222222223", "Luna"),
  ]);

  renderRelated();

  expect(await screen.findByText("Thor")).toBeInTheDocument();
  expect(screen.getByText("Luna")).toBeInTheDocument();
  expect(screen.queryByText("Mel")).not.toBeInTheDocument();
});

test("corta em quatro animais relacionados", async () => {
  vi.spyOn(publicApi, "listAnimals").mockResolvedValue([
    animal("11111111-1111-4111-8111-111111111111", "Um"),
    animal("11111111-1111-4111-8111-111111111112", "Dois"),
    animal("11111111-1111-4111-8111-111111111113", "Três"),
    animal("11111111-1111-4111-8111-111111111114", "Quatro"),
    animal("11111111-1111-4111-8111-111111111115", "Cinco"),
    animal("11111111-1111-4111-8111-111111111116", "Seis"),
  ]);

  renderRelated();

  expect(await screen.findByText("Quatro")).toBeInTheDocument();
  expect(screen.getByText("Um")).toBeInTheDocument();
  expect(screen.getByText("Dois")).toBeInTheDocument();
  expect(screen.getByText("Três")).toBeInTheDocument();
  expect(screen.queryByText("Cinco")).not.toBeInTheDocument();
  expect(screen.queryByText("Seis")).not.toBeInTheDocument();
});

test("não renderiza nada quando só resta o próprio animal", async () => {
  const promise = Promise.resolve([animal(CURRENT_ID, "Mel")]);
  vi.spyOn(publicApi, "listAnimals").mockReturnValue(promise);

  renderRelated();
  await act(async () => {
    await promise;
  });

  expect(screen.queryByText(/Outros animais do/)).not.toBeInTheDocument();
  expect(screen.queryByText("Mel")).not.toBeInTheDocument();
});

test("busca a lista filtrada pela ONG do animal, não a vitrine inteira", async () => {
  vi.spyOn(publicApi, "listAnimals").mockResolvedValue([
    animal("11111111-1111-4111-8111-111111111111", "Thor"),
  ]);

  renderRelated();

  await screen.findByText("Thor");
  expect(publicApi.listAnimals).toHaveBeenCalledWith({ org: ORG_SLUG });
});
