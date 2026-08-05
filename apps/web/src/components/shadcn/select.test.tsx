import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

function Harness() {
  const [value, setValue] = useState("cão");
  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger aria-label="Espécie"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="cão">Cão</SelectItem>
        <SelectItem value="gato">Gato</SelectItem>
      </SelectContent>
    </Select>
  );
}

test("mostra o rótulo do valor escolhido, não o valor cru", async () => {
  render(<Harness />);
  expect(screen.getByLabelText("Espécie")).toHaveTextContent("Cão");
});

test("troca o valor ao escolher outra opção", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByLabelText("Espécie"));
  await user.click(await screen.findByRole("option", { name: "Gato" }));
  expect(screen.getByLabelText("Espécie")).toHaveTextContent("Gato");
});
