import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi, beforeEach } from "vitest";
import { HomePage } from "./HomePage";
import { publicApi } from "../../lib/publicApi";

beforeEach(() => {
  vi.spyOn(publicApi, "listAnimals").mockResolvedValue([
    {
      id: 1, name: "Thor", species: "cão", breed: null, sex: "macho", size: "M",
      birth_estimate: null, description: null, photo_url: null, org_id: 1,
      org_name: "Abrigo Amigo Fiel", org_city: "João Pessoa", org_slug: "abrigo-amigo-fiel",
    },
  ]);
});

test("renders animal cards from the API", async () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  expect(await screen.findByText("Thor")).toBeInTheDocument();
  expect(screen.getByText(/Abrigo Amigo Fiel/)).toBeInTheDocument();
});
