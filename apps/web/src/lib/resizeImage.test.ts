import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MAX_IMAGE_SIDE, resizeImage } from "./resizeImage";

/** jsdom não tem canvas nem createImageBitmap: dublamos os dois. */
function stubCanvas(sourceWidth: number, sourceHeight: number) {
  const drawn: { w: number; h: number }[] = [];

  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: sourceWidth, height: sourceHeight, close: vi.fn() }),
  );

  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: (_img: unknown, _x: number, _y: number, w: number, h: number) => {
        drawn.push({ w, h });
      },
    }),
    toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(["x"], { type: "image/jpeg" })),
  };
  vi.spyOn(document, "createElement").mockImplementation(((tag: string) =>
    tag === "canvas" ? canvas : document.createElement(tag)) as typeof document.createElement);

  return { canvas, drawn };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("imagem maior que o limite é reduzida mantendo a proporção", async () => {
  const { canvas } = stubCanvas(4000, 3000);
  const file = new File(["x"], "foto.jpg", { type: "image/jpeg" });

  await resizeImage(file);

  // lado maior vai a 1600, o menor acompanha na mesma razão
  expect(canvas.width).toBe(MAX_IMAGE_SIDE);
  expect(canvas.height).toBe(1200);
});

test("imagem em pé reduz pela altura", async () => {
  const { canvas } = stubCanvas(1500, 3000);
  const file = new File(["x"], "foto.jpg", { type: "image/jpeg" });

  await resizeImage(file);

  expect(canvas.height).toBe(MAX_IMAGE_SIDE);
  expect(canvas.width).toBe(800);
});

test("imagem menor que o limite não é ampliada", async () => {
  const { canvas } = stubCanvas(800, 600);
  const file = new File(["x"], "foto.jpg", { type: "image/jpeg" });

  await resizeImage(file);

  expect(canvas.width).toBe(800);
  expect(canvas.height).toBe(600);
});

test("o resultado sai como JPEG, qualquer que seja a entrada", async () => {
  stubCanvas(2000, 2000);
  const file = new File(["x"], "foto.png", { type: "image/png" });

  const out = await resizeImage(file);

  expect(out.type).toBe("image/jpeg");
  expect(out.name).toBe("foto.jpg");
});

test("se o navegador não conseguir decodificar, o arquivo original passa direto", async () => {
  // A API valida de novo do outro lado; travar o cadastro por causa disto seria pior.
  vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("decode failed")));
  const file = new File(["x"], "foto.jpg", { type: "image/jpeg" });

  const out = await resizeImage(file);

  expect(out).toBe(file);
});
