import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { resizeImage } from "@/lib/resizeImage";
import { cn } from "@/lib/utils";

export type UploaderPhoto = { id: string; url: string };

/** Capa + 3. Mesmo limite validado na API. */
export const MAX_PHOTOS = 4;

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export type PhotoUploaderProps = {
  photos: UploaderPhoto[];
  pending: File[];
  onPick: (files: File[]) => Promise<void> | void;
  onRemovePhoto: (photoId: string) => void;
  onRemovePending: (index: number) => void;
  onSetCover: (photoId: string) => void;
  /** Fotos ainda não enviadas (criação do animal) não têm id — trocar a capa
   * entre elas é só reordenar a lista local, sem chamada à API. */
  onSetPendingCover: (index: number) => void;
  disabled?: boolean;
  /** Redimensionar + subir a foto leva alguns segundos; o formulário usa isto para
   * bloquear o Salvar enquanto isso, já que salvar antes deixaria o animal sem a foto. */
  onBusyChange?: (busy: boolean) => void;
};

export function PhotoUploader({
  photos,
  pending,
  onPick,
  onRemovePhoto,
  onRemovePending,
  onSetCover,
  onSetPendingCover,
  disabled,
  onBusyChange,
}: PhotoUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // URLs de preview dos arquivos ainda não enviados. Revogadas na limpeza para não
  // vazar memória enquanto a ONG troca de foto várias vezes.
  const previews = useMemo(() => pending.map((f) => URL.createObjectURL(f)), [pending]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const total = photos.length + pending.length;

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? []);
    // Permite reescolher o mesmo arquivo depois de removê-lo.
    e.target.value = "";
    if (chosen.length === 0) return;

    setError(null);

    const validos = chosen.filter((f) => ACCEPTED.includes(f.type));
    if (validos.length < chosen.length) {
      setError("A foto precisa ser JPG, PNG ou WEBP.");
    }

    const cabem = validos.slice(0, MAX_PHOTOS - total);
    if (cabem.length < validos.length) {
      setError(`São até 4 fotos por animal. Remova uma antes de adicionar outra.`);
    }
    if (cabem.length === 0) return;

    setBusy(true);
    onBusyChange?.(true);
    try {
      const resized = await Promise.all(cabem.map((f) => resizeImage(f)));
      await onPick(resized);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  const slots = [
    ...photos.map((p, i) => ({
      key: p.id,
      src: p.url,
      cover: i === 0,
      onRemove: () => onRemovePhoto(p.id),
      onCover: i === 0 ? undefined : () => onSetCover(p.id),
    })),
    ...pending.map((_f, i) => ({
      key: `pending-${i}`,
      src: previews[i],
      cover: photos.length === 0 && i === 0,
      onRemove: () => onRemovePending(i),
      onCover: photos.length === 0 && i > 0 ? () => onSetPendingCover(i) : undefined,
    })),
  ];

  return (
    <div className="flex flex-col gap-2.5">
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-4 gap-2.5">
        {slots.map((slot) => (
          <div
            key={slot.key}
            data-testid="photo-slot"
            className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
          >
            <img src={slot.src} alt="" className="h-full w-full object-cover" />
            {slot.cover && (
              <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                CAPA
              </span>
            )}
            <button
              type="button"
              aria-label="Remover foto"
              disabled={disabled}
              onClick={slot.onRemove}
              className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-slate-900/60 text-white transition hover:bg-slate-900/80"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
            {slot.onCover && (
              <button
                type="button"
                disabled={disabled}
                onClick={slot.onCover}
                className="absolute inset-x-0 bottom-0 bg-slate-900/70 py-1 text-[10px] font-semibold text-white transition hover:bg-slate-900/85"
              >
                Definir como capa
              </button>
            )}
          </div>
        ))}

        {total < MAX_PHOTOS && (
          <label
            className={cn(
              "grid aspect-square cursor-pointer place-items-center gap-1 rounded-md border border-dashed border-slate-300 bg-background text-center text-[11.5px] font-semibold text-muted-foreground",
              (disabled || busy) && "pointer-events-none opacity-50",
            )}
          >
            {busy ? (
              <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            ) : (
              <Plus aria-hidden="true" className="h-5 w-5" />
            )}
            {busy ? "enviando…" : "adicionar foto"}
            <input
              ref={inputRef}
              type="file"
              aria-label="Adicionar foto"
              accept={ACCEPTED.join(",")}
              multiple
              disabled={disabled || busy}
              onChange={handleChange}
              className="sr-only"
            />
          </label>
        )}
      </div>

      <span className="font-mono text-[11.5px] text-muted-foreground">
        JPG, PNG ou WEBP · até 4 fotos · redimensionadas automaticamente
      </span>
    </div>
  );
}
