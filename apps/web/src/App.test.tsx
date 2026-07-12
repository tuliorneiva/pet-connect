import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the PetConnect heading", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: /petconnect/i })).toBeInTheDocument();
});
