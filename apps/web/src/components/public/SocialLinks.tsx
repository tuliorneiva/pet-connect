import type { ReactNode } from "react";
import { WhatsAppIcon, InstagramIcon, FacebookIcon } from "@/components/icons/SocialIcons";
import { buildWhatsAppUrl, buildInstagramUrl, buildFacebookUrl } from "@/lib/socialLinks";

type SocialLinksProps = {
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  orgName: string;
};

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-[10px] bg-accent text-accent-foreground transition hover:bg-[#CFFAFE]"
    >
      {children}
    </a>
  );
}

export function SocialLinks({ whatsapp, instagram, facebook, orgName }: SocialLinksProps) {
  if (!whatsapp && !instagram && !facebook) return null;

  return (
    <div className="mt-4 flex gap-2 border-t border-border pt-4">
      {whatsapp && (
        <SocialLink
          href={buildWhatsAppUrl(whatsapp, `Olá! Vi a página da ${orgName} no PetConnecta.`)}
          label="Conversar no WhatsApp"
        >
          <WhatsAppIcon className="h-4 w-4" />
        </SocialLink>
      )}
      {instagram && (
        <SocialLink href={buildInstagramUrl(instagram)} label="Ver no Instagram">
          <InstagramIcon className="h-4 w-4" />
        </SocialLink>
      )}
      {facebook && (
        <SocialLink href={buildFacebookUrl(facebook)} label="Ver no Facebook">
          <FacebookIcon className="h-4 w-4" />
        </SocialLink>
      )}
    </div>
  );
}
