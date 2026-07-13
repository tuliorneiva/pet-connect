import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { AdminLayout } from "./AdminLayout";
import * as auth from "../auth/AuthContext";

test("renders the brand and the logged-in user's name", () => {
  vi.spyOn(auth, "useAuth").mockReturnValue({
    user: { id: 1, name: "Ana", email: "ana@x.org", org_id: 1 },
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  });
  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<p>painel</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText("PetConnect")).toBeInTheDocument();
  expect(screen.getByText("Ana")).toBeInTheDocument();
  expect(screen.getByText("painel")).toBeInTheDocument();
});
