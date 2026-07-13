import { render, screen } from "@testing-library/react";
import { Field } from "./Field";

test("associates the label with the input and shows the error", () => {
  render(<Field label="E-mail" error="Obrigatório" name="email" />);
  const input = screen.getByLabelText("E-mail");
  expect(input).toBeInTheDocument();
  expect(screen.getByText("Obrigatório")).toBeInTheDocument();
});
