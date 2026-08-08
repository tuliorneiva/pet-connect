import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { expect, test, vi, beforeEach } from "vitest";
import { OrgPage } from "./OrgPage";
import { publicApi } from "../../lib/publicApi";

const BASE_ORG = {
  id: "22222222-2222-4222-8222-222222222222", name: "Abrigo Amigo Fiel", slug: "abrigo-amigo-fiel", city: "João Pessoa",
  description: "Resgatamos e cuidamos.", email: "contato@amigofiel.org", phone: "(83) 99999-0000",
  website: "amigofiel.org", address: "Rua X, 240", founded_year: 2019, verified: true,
  logo_url: null, whatsapp: null, instagram: null, facebook: null,
  created_at: "2021-01-01T00:00:00Z", available_count: 3, adopted_count: 12,
};

beforeEach(() => {
  vi.spyOn(publicApi, "listAnimals").mockResolvedValue([]);
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/ongs/abrigo-amigo-fiel"]}>
      <Routes><Route path="/ongs/:slug" element={<OrgPage />} /></Routes>
    </MemoryRouter>,
  );
}

test("renders the organization profile", async () => {
  vi.spyOn(publicApi, "getOrganization").mockResolvedValue({ ...BASE_ORG });
  renderPage();
  expect(await screen.findByText("Abrigo Amigo Fiel")).toBeInTheDocument();
  expect(screen.getByText("contato@amigofiel.org")).toBeInTheDocument();
});

test("does not render social links when the org didn't set any", async () => {
  vi.spyOn(publicApi, "getOrganization").mockResolvedValue({ ...BASE_ORG });
  renderPage();
  await screen.findByText("Abrigo Amigo Fiel");
  expect(screen.queryByLabelText(/whatsapp|instagram|facebook/i)).not.toBeInTheDocument();
});

test("renders social links when the org set them", async () => {
  vi.spyOn(publicApi, "getOrganization").mockResolvedValue({
    ...BASE_ORG,
    whatsapp: "83900000000",
    instagram: "abrigoamigofiel",
    facebook: "abrigoamigofiel",
  });
  renderPage();
  await screen.findByText("Abrigo Amigo Fiel");
  expect(screen.getByRole("link", { name: /whatsapp/i })).toHaveAttribute(
    "href",
    expect.stringContaining("wa.me/5583900000000"),
  );
  expect(screen.getByRole("link", { name: /instagram/i })).toHaveAttribute(
    "href",
    "https://instagram.com/abrigoamigofiel",
  );
  expect(screen.getByRole("link", { name: /facebook/i })).toHaveAttribute(
    "href",
    "https://facebook.com/abrigoamigofiel",
  );
});
