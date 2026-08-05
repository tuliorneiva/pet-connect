import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { InterestModal } from "./AnimalPublicPage";

test("o botão de enviar fica no rodapé centralizado", () => {
  render(<InterestModal open onClose={() => {}} animalId="abc" animalName="Mel" />);
  const footer = screen.getByTestId("interest-footer");
  expect(footer).toHaveClass("justify-center");
  expect(footer).toContainElement(screen.getByRole("button", { name: /enviar solicitação/i }));
});

test("o título nomeia o animal", () => {
  render(<InterestModal open onClose={() => {}} animalId="abc" animalName="Mel" />);
  expect(screen.getByRole("dialog")).toHaveAccessibleName(/interesse em mel/i);
});

test("pressionar Escape com o modal aberto chama onClose", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<InterestModal open onClose={onClose} animalId="abc" animalName="Mel" />);
  await user.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("ao abrir, o foco vai para dentro do diálogo", () => {
  render(<InterestModal open onClose={() => {}} animalId="abc" animalName="Mel" />);
  const dialog = screen.getByRole("dialog");
  expect(dialog).toContainElement(document.activeElement as HTMLElement);
});
