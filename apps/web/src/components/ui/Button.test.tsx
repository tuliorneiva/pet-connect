import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

test("renders a button with its label and fires onClick", async () => {
  const { getByRole } = render(<Button>Salvar</Button>);
  expect(getByRole("button", { name: "Salvar" })).toBeInTheDocument();
});

test("respects the disabled attribute", () => {
  render(<Button disabled>Enviar</Button>);
  expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
});
