import { useState } from "react";
import { WhatsAppIcon, InstagramIcon, FacebookIcon } from "@/components/icons/SocialIcons";
import { buildWhatsAppShareUrl, buildFacebookShareUrl } from "@/lib/socialLinks";

type ShareButtonsProps = { url: string; text: string };

const iconButton =
  "grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-primary hover:text-primary";

export function ShareButtons({ url, text }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  async function copyForInstagram() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem permissão de clipboard (ex.: contexto não seguro) — não há fallback
      // melhor do que deixar a pessoa copiar o link da barra de endereço.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground">Compartilhar</span>
      <a
        href={buildWhatsAppShareUrl(`${text} ${url}`)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartilhar no WhatsApp"
        title="Compartilhar no WhatsApp"
        className={iconButton}
      >
        <WhatsAppIcon className="h-4 w-4" />
      </a>
      <a
        href={buildFacebookShareUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartilhar no Facebook"
        title="Compartilhar no Facebook"
        className={iconButton}
      >
        <FacebookIcon className="h-4 w-4" />
      </a>
      <button
        type="button"
        onClick={copyForInstagram}
        aria-label="Copiar link para compartilhar no Instagram"
        title="Copiar link para compartilhar no Instagram"
        className={iconButton}
      >
        <InstagramIcon className="h-4 w-4" />
      </button>
      {copied && <span className="text-xs font-semibold text-primary">Link copiado!</span>}
    </div>
  );
}
