import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/shadcn/button";

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-17 max-w-6xl items-center gap-6 px-6" style={{ height: 68 }}>
          <Link to="/lp" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-primary to-[#0891B2] text-white">🐾</span>
            Pet<span className="text-primary">Connect</span>
          </Link>
          <nav className="ml-auto flex items-center gap-3">
            <Button asChild variant="ghost" size="sm"><Link to="/">Animais</Link></Button>
            <Button asChild size="sm"><Link to="/login">Área da ONG</Link></Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
