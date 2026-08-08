import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { PhotoUploader } from "./PhotoUploader";

// jsdom não implementa createImageBitmap nem canvas: sem isso, resizeImage cai no
// catch e devolve o arquivo original, e o teste de reencode não teria como provar
// nada (mesma dublagem usada em lib/resizeImage.test.ts).
function stubCanvas() {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 800, height: 600, close: vi.fn() }),
  );

  const realCreateElement = document.createElement.bind(document);
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: () => {} }),
    toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(["x"], { type: "image/jpeg" })),
  };
  vi.spyOn(document, "createElement").mockImplementation(((tag: string) =>
    tag === "canvas" ? canvas : realCreateElement(tag)) as typeof document.createElement);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const PHOTOS = [
  { id: "p1", url: "https://cdn/a.jpg" },
  { id: "p2", url: "https://cdn/b.jpg" },
];

function setup(overrides = {}) {
  const props = {
    photos: PHOTOS,
    pending: [] as File[],
    onPick: vi.fn(),
    onRemovePhoto: vi.fn(),
    onRemovePending: vi.fn(),
    onSetCover: vi.fn(),
    onSetPendingCover: vi.fn(),
    ...overrides,
  };
  render(<PhotoUploader {...props} />);
  return props;
}

test("a primeira foto é marcada como capa e as outras não", () => {
  setup();
  const slots = screen.getAllByTestId("photo-slot");
  expect(slots[0]).toHaveTextContent("CAPA");
  expect(slots[1]).not.toHaveTextContent("CAPA");
});

test("só as fotos que não são capa oferecem 'definir como capa'", async () => {
  const props = setup();
  const buttons = screen.getAllByRole("button", { name: /definir como capa/i });
  expect(buttons).toHaveLength(1);

  await userEvent.click(buttons[0]);
  expect(props.onSetCover).toHaveBeenCalledWith("p2");
});

test("remover uma foto persistida avisa quem é", async () => {
  const props = setup();
  await userEvent.click(screen.getAllByRole("button", { name: /remover foto/i })[0]);
  expect(props.onRemovePhoto).toHaveBeenCalledWith("p1");
});

test("o slot de adicionar some quando já há 4 fotos", () => {
  setup({
    photos: [
      { id: "p1", url: "a" },
      { id: "p2", url: "b" },
      { id: "p3", url: "c" },
      { id: "p4", url: "d" },
    ],
  });
  expect(screen.queryByLabelText("Adicionar foto")).not.toBeInTheDocument();
});

test("escolher um arquivo entrega a versão reduzida, não o original", async () => {
  stubCanvas();
  const props = setup({ photos: [] });
  const original = new File(["conteudo-grande"], "foto.png", { type: "image/png" });

  await userEvent.upload(screen.getByLabelText("Adicionar foto"), original);

  await waitFor(() => expect(props.onPick).toHaveBeenCalled());
  const [entregues] = props.onPick.mock.calls[0];
  // resizeImage reencoda em JPEG; se viesse o original, o type seria image/png
  expect(entregues[0].type).toBe("image/jpeg");
});

test("recusa a quinta foto antes de chamar a API e diz por quê", async () => {
  const props = setup({ photos: [{ id: "p1", url: "a" }, { id: "p2", url: "b" }, { id: "p3", url: "c" }] });

  const arquivos = [
    new File(["a"], "1.jpg", { type: "image/jpeg" }),
    new File(["b"], "2.jpg", { type: "image/jpeg" }),
  ];
  await userEvent.upload(screen.getByLabelText("Adicionar foto"), arquivos);

  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("até 4 fotos"));
  // a que cabia passou (é mesmo "1.jpg", não só uma foto qualquer); a que não cabia foi barrada
  expect(props.onPick).toHaveBeenCalledTimes(1);
  expect(props.onPick.mock.calls[0][0]).toHaveLength(1);
  expect(props.onPick.mock.calls[0][0][0].name).toBe("1.jpg");
});

test("recusa um arquivo que não é imagem aceita", async () => {
  const props = setup({ photos: [] });
  const pdf = new File(["x"], "doc.pdf", { type: "application/pdf" });

  // applyAccept: false simula o arquivo chegando por drag-and-drop ou "todos os arquivos",
  // que é justamente o caso em que o `accept` do input não protege e a validação precisa agir.
  await userEvent.upload(screen.getByLabelText("Adicionar foto"), pdf, { applyAccept: false });

  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("JPG, PNG ou WEBP"));
  expect(props.onPick).not.toHaveBeenCalled();
});

test("arquivos pendentes aparecem junto com os persistidos e podem ser removidos", async () => {
  const pending = [new File(["a"], "novo.jpg", { type: "image/jpeg" })];
  const props = setup({ photos: [{ id: "p1", url: "a" }], pending });

  expect(screen.getAllByTestId("photo-slot")).toHaveLength(2);
  await userEvent.click(screen.getAllByRole("button", { name: /remover foto/i })[1]);
  expect(props.onRemovePending).toHaveBeenCalledWith(0);
});

test("sem animal ainda (só pendentes), a segunda foto pendente oferece 'definir como capa'", async () => {
  const pending = [
    new File(["a"], "um.jpg", { type: "image/jpeg" }),
    new File(["b"], "dois.jpg", { type: "image/jpeg" }),
  ];
  const props = setup({ photos: [], pending });

  const slots = screen.getAllByTestId("photo-slot");
  expect(slots[0]).toHaveTextContent("CAPA");

  const buttons = screen.getAllByRole("button", { name: /definir como capa/i });
  expect(buttons).toHaveLength(1);

  await userEvent.click(buttons[0]);
  expect(props.onSetPendingCover).toHaveBeenCalledWith(1);
});
