import { render, screen } from "@testing-library/react";
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
