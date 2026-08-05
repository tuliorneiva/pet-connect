import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnimalGallery } from "./AnimalGallery";

test("sem fotos mostra o marcador e nenhuma imagem", () => {
  render(<AnimalGallery photos={[]} name="Mel" />);
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByTestId("gallery-empty")).toBeInTheDocument();
});

test("com uma foto não renderiza miniaturas", () => {
  render(<AnimalGallery photos={["/a.jpg"]} name="Mel" />);
  expect(screen.getByRole("img")).toHaveAttribute("src", "/a.jpg");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("clicar numa miniatura troca a foto principal", async () => {
  const user = userEvent.setup();
  render(<AnimalGallery photos={["/a.jpg", "/b.jpg"]} name="Mel" />);
  await user.click(screen.getByRole("button", { name: "Ver foto 2 de Mel" }));
  expect(screen.getByTestId("gallery-main")).toHaveAttribute("src", "/b.jpg");
});

test("lida corretamente com URLs duplicadas", async () => {
  const user = userEvent.setup();
  render(<AnimalGallery photos={["/a.jpg", "/a.jpg", "/b.jpg"]} name="Mel" />);
  expect(screen.getAllByRole("button")).toHaveLength(3);
  await user.click(screen.getByRole("button", { name: "Ver foto 3 de Mel" }));
  expect(screen.getByTestId("gallery-main")).toHaveAttribute("src", "/b.jpg");
  await user.click(screen.getByRole("button", { name: "Ver foto 2 de Mel" }));
  expect(screen.getByTestId("gallery-main")).toHaveAttribute("src", "/a.jpg");
});
