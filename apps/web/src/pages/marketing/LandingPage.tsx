import { Link } from "react-router-dom";
import { Dog, Heart, MessageCircle, PawPrint, Search, ShieldCheck, Stethoscope } from "lucide-react";
import { publicApi } from "../../lib/publicApi";
import { useAsync } from "../../lib/useAsync";
import { AnimalCard } from "../../components/AnimalCard";
import { Button } from "@/components/shadcn/button";

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-6" style={{ height: 68 }}>
        <Link to="/lp" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-primary to-[#0891B2] text-white">
            <PawPrint className="h-4 w-4" aria-hidden="true" />
          </span>
          Pet<span className="text-primary">Connect</span>
        </Link>
        <nav className="ml-2 hidden gap-7 md:flex">
          <a href="#como" className="text-sm font-medium text-muted-foreground hover:text-foreground">Como funciona</a>
          <a href="#destaques" className="text-sm font-medium text-muted-foreground hover:text-foreground">Animais</a>
          <a href="#porque" className="text-sm font-medium text-muted-foreground hover:text-foreground">Por que nós</a>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Button asChild variant="outline" size="sm"><Link to="/login">Entrar</Link></Button>
          <Button asChild size="sm"><Link to="/animais">Ver animais</Link></Button>
        </div>
      </div>
    </header>
  );
}

function Highlights() {
  const { data } = useAsync(() => publicApi.listAnimals(), []);
  const featured = (data ?? []).slice(0, 4);
  if (featured.length === 0) return null;
  return (
    <section id="destaques" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-primary">Esperando por você</div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Animais em destaque</h2>
          <p className="mt-3.5 text-lg text-muted-foreground">Alguns dos amigos prontos para um novo lar agora.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((a) => <AnimalCard key={a.id} animal={a} />)}
        </div>
        <div className="mt-11 text-center">
          <Button asChild size="lg"><Link to="/animais">Ver todos os animais →</Link></Button>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { n: 1, t: "Busque", d: "Use os filtros por espécie, porte, sexo e cidade para encontrar quem combina com o seu momento." },
  { n: 2, t: "Conheça", d: "Veja o perfil completo: personalidade, histórico de saúde, vacinas e a ONG responsável." },
  { n: 3, t: "Adote", d: "Fale direto com a ONG, envie sua solicitação e combine a visita. Sem intermediários." },
];

const FEATURES = [
  { i: Search, t: "Busca com filtros reais", d: "Espécie, porte, sexo e cidade. Encontre rápido os animais compatíveis com a sua rotina." },
  { i: Stethoscope, t: "Histórico de saúde completo", d: "Vacinas, castração, vermifugação e observações clínicas registradas pela ONG." },
  { i: MessageCircle, t: "Contato direto com a ONG", d: "Envie sua solicitação de adoção e converse com quem realmente conhece o animal." },
  { i: ShieldCheck, t: "ONGs verificadas", d: "Trabalhamos apenas com abrigos e protetores cadastrados e acompanhados pela plataforma." },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_82%_-10%,#ECFEFF,transparent_60%),radial-gradient(700px_500px_at_0%_110%,#F0FDFA,transparent_55%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" /> Adoção responsável e transparente
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-balance sm:text-5xl">
              Encontre seu <span className="text-primary">novo melhor amigo</span> para adotar
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Reunimos animais de ONGs e abrigos parceiros em um só lugar. Filtre, conheça a história de cada um e fale direto com quem cuida.
            </p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <Button asChild size="lg"><Link to="/animais">Ver animais para adoção →</Link></Button>
              <Button asChild size="lg" variant="outline"><a href="#como">Como funciona</a></Button>
            </div>
            <div className="mt-11 flex gap-9">
              <div><div className="text-2xl font-bold tracking-tight">320+</div><div className="text-sm text-muted-foreground">animais disponíveis</div></div>
              <div><div className="text-2xl font-bold tracking-tight">45</div><div className="text-sm text-muted-foreground">ONGs parceiras</div></div>
              <div><div className="text-2xl font-bold tracking-tight">1.240</div><div className="text-sm text-muted-foreground">adoções realizadas</div></div>
            </div>
          </div>
          <div className="relative mx-auto max-w-md">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <div className="grid aspect-[4/3.4] place-items-center bg-[radial-gradient(120%_120%_at_70%_20%,#67E8F9,#22D3EE_30%,#0E7490)] text-white">
                <Dog className="h-24 w-24" aria-hidden="true" />
              </div>
              <div className="flex items-center justify-between p-4">
                <div><div className="font-bold">Thor</div><div className="text-sm text-muted-foreground">SRD · Macho · Porte médio</div></div>
                <span className="rounded-full border border-[#cffafe] bg-accent px-2.5 py-0.5 text-xs font-semibold text-primary">Disponível</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="como" className="border-y border-border bg-card py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-primary">Simples assim</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Adotar em três passos</h2>
            <p className="mt-3.5 text-lg text-muted-foreground">Do primeiro clique ao dia em que ele chega em casa.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-xl border border-border bg-card p-7">
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#cffafe] bg-accent text-lg font-bold text-primary">{s.n}</div>
                <h3 className="mt-5 text-lg font-bold">{s.t}</h3>
                <p className="mt-2 text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Highlights />

      <section id="porque" className="border-y border-border bg-card py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-primary">Por que PetConnect</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Adoção com informação e confiança</h2>
            <p className="mt-3.5 text-lg text-muted-foreground">Tudo o que você precisa para decidir com segurança — e cuidar bem depois.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.t} className="flex gap-4 rounded-xl border border-border bg-card p-6">
                <div className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-accent text-primary">
                  <f.i className="h-6 w-6" aria-hidden="true" />
                </div>
                <div><h3 className="text-lg font-bold">{f.t}</h3><p className="mt-1.5 text-muted-foreground">{f.d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ongs" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-8 rounded-2xl bg-gradient-to-br from-primary to-[#155E75] p-12 text-white md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">É uma ONG ou abrigo?</h2>
              <p className="mt-3 text-lg text-cyan-50">Cadastre seus animais, organize o histórico de saúde e receba solicitações de adoção — tudo em um painel gratuito.</p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Button asChild size="lg" variant="secondary"><Link to="/registrar">Cadastrar minha ONG</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card py-20 text-center">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Tem espaço no sofá e no coração?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">Milhares de animais esperam por um lar. O próximo pode estar a um clique de você.</p>
          <div className="mt-8"><Button asChild size="lg"><Link to="/animais">Encontrar meu amigo →</Link></Button></div>
        </div>
      </section>

      <footer className="bg-[#0F172A] py-10 text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 text-sm">
          <div className="flex items-center gap-1.5 text-base font-bold text-white">
            <PawPrint className="h-4 w-4" aria-hidden="true" /> Pet<span className="text-[#67E8F9]">Connect</span>
          </div>
          <span className="flex items-center gap-1">
            © 2026 PetConnect · Feito com <Heart className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> para os animais.
          </span>
        </div>
      </footer>
    </div>
  );
}
