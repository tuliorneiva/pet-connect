import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import App from "./App";

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("redirects / to the landing page", () => {
  renderAt("/");
  expect(
    screen.getByRole("heading", { name: /novo melhor amigo/i }),
  ).toBeInTheDocument();
});

test("renders the public animal showcase at /animais", () => {
  renderAt("/animais");
  expect(screen.getByRole("heading", { name: /adote um amigo/i })).toBeInTheDocument();
});
