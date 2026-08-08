import { useState } from "react";
import type { ChangeEvent } from "react";
import { Home, Loader2 } from "lucide-react";
import { resizeImage } from "@/lib/resizeImage";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export type OrgLogoUploaderProps = {
  logoUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  disabled?: boolean;
};

export function OrgLogoUploader({ logoUrl, onUpload, onRemove, disabled }: OrgLogoUploaderProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      setError("A logo precisa ser JPG, PNG ou WEBP.");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await onUpload(await resizeImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar a logo");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setBusy(true);
    try {
      await onRemove();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover a logo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 flex-none place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#22D3EE] to-primary text-white">
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          ) : logoUrl ? (
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Home className="h-7 w-7" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {logoUrl ? "Logo enviada" : "Sem logo — a página pública mostra o ícone padrão"}
          </p>
          <div className="flex gap-2">
            <label
              className={
                "inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-card px-3.5 text-xs font-semibold text-foreground hover:bg-slate-50" +
                (disabled || busy ? " pointer-events-none opacity-50" : "")
              }
            >
              Enviar logo
              <input
                type="file"
                aria-label="Enviar logo"
                accept={ACCEPTED.join(",")}
                disabled={disabled || busy}
                onChange={handleChange}
                className="sr-only"
              />
            </label>
            {logoUrl && (
              <button
                type="button"
                disabled={disabled || busy}
                onClick={handleRemove}
                className="h-9 rounded-md px-3.5 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
