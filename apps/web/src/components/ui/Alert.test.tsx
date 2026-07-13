import { render, screen } from "@testing-library/react";
import { Alert } from "./Alert";

test("renders its message with an alert role", () => {
  render(<Alert variant="error">Falha ao entrar</Alert>);
  expect(screen.getByRole("alert")).toHaveTextContent("Falha ao entrar");
});
