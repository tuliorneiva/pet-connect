import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { expect, test, vi, beforeEach } from "vitest";
import { OrgPage } from "./OrgPage";
import { publicApi } from "../../lib/publicApi";

beforeEach(() => {
  vi.spyOn(publicApi, "getOrganization").mockResolvedValue({
    id: "22222222-2222-4222-8222-222222222222", name: "Abrigo Amigo Fiel", slug: "abrigo-amigo-fiel", city: "João Pessoa",
    description: "Resgatamos e cuidamos.", email: "contato@amigofiel.org", phone: "(83) 99999-0000",
    website: "amigofiel.org", address: "Rua X, 240", founded_year: 2019, verified: true,
    logo_url: null, created_at: "2021-01-01T00:00:00Z", available_count: 3, adopted_count: 12,
  });
  vi.spyOn(publicApi, "listAnimals").mockResolvedValue([]);
});

test("renders the organization profile", async () => {
  render(
    <MemoryRouter initialEntries={["/ongs/abrigo-amigo-fiel"]}>
      <Routes><Route path="/ongs/:slug" element={<OrgPage />} /></Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText("Abrigo Amigo Fiel")).toBeInTheDocument();
  expect(screen.getByText("contato@amigofiel.org")).toBeInTheDocument();
});
