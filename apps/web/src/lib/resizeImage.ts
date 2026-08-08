/** Lado maior da imagem depois de reduzida. */
export const MAX_IMAGE_SIDE = 1600;

/** Qualidade do JPEG de saída: ~150-400 KB para uma foto de celular. */
export const JPEG_QUALITY = 0.82;

/**
 * Reduz e reencoda a imagem antes do envio.
 *
 * Foto de celular sai com 2-5 MB e não passaria no limite de 1 MB do bucket. Aqui ela
 * cai para a casa das centenas de KB e a vitrine carrega mais rápido. A validação no
 * servidor continua existindo como rede de segurança.
 *
 * Qualquer falha de decodificação devolve o arquivo original: quem valida de verdade
 * é a API, e travar o cadastro por causa do canvas seria pior que tentar subir.
 */
export async function resizeImage(file: File, maxSide = MAX_IMAGE_SIDE): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}
