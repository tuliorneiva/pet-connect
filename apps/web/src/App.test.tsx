import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import App from "./App";

test("renders the public home at /", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading", { name: /adote um amigo/i })).toBeInTheDocument();
});
