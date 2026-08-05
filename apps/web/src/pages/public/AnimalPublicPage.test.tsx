import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import * as publicApi from "@/lib/publicApi";
import { AnimalPublicPage } from "./AnimalPublicPage";

const MEL = {
  id: "44444444-4444-4444-8444-444444444444",
  name: "Mel", species: "cão", breed: "Labrador", sex: "fêmea", size: "M",
  birth_estimate: "1 ano", description: "Cheia de energia.", photo_url: "/mel.jpg",
  org_id: "22222222-2222-4222-8222-222222222222", org_name: "Abrigo Amigo Fiel",
  org_city: "João Pessoa", org_slug: "abrigo-amigo-fiel",
  vaccines_up_to_date: true, under_treatment: false,
};

function renderPage() {
  vi.spyOn(publicApi.publicApi, "getAnimal").mockResolvedValue(MEL as never);
  vi.spyOn(publicApi.publicApi, "listAnimals").mockResolvedValue([MEL] as never);
  render(
    <MemoryRouter initialEntries={[`/animais/${MEL.id}`]}>
      <Routes><Route path="/animais/:id" element={<AnimalPublicPage />} /></Routes>
    </MemoryRouter>,
  );
}

test("mostra nome, características e o selo de vacinação", async () => {
  renderPage();
  expect(await screen.findByRole("heading", { name: "Mel" })).toBeInTheDocument();
  expect(screen.getByText("Labrador")).toBeInTheDocument();
  expect(screen.getByText("Vacinação em dia")).toBeInTheDocument();
});

test("o botão de interesse ocupa o painel inteiro", async () => {
  renderPage();
  const cta = await screen.findByRole("button", { name: /tenho interesse/i });
  expect(cta).toHaveClass("w-full");
});

test("liga para o perfil da ONG", async () => {
  renderPage();
  await waitFor(() =>
    expect(screen.getByRole("link", { name: /abrigo amigo fiel/i }))
      .toHaveAttribute("href", "/ongs/abrigo-amigo-fiel"),
  );
});
