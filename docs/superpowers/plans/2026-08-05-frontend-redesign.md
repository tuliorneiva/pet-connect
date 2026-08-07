# Redesign do front do PetConnect — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir a página pública do animal no layout A (galeria, painel de decisão, selos de saúde, animais relacionados) e terminar a migração dos componentes para shadcn, incluindo selects e modal.

**Architecture:** O backend ganha apenas dois campos derivados no response público do animal (situação de vacinação e tratamento em curso) e um filtro de exclusão na listagem, para alimentar os relacionados. Todo o resto é frontend: dois componentes shadcn novos baseados em Radix (`Select`, `Dialog`), um componente de galeria, e a reescrita da `AnimalPublicPage`. As fotos múltiplas **não** entram aqui — a galeria opera sobre o `photo_url` atual e ganha as demais fotos no plano seguinte, sem mexer no layout.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4, Radix UI, FastAPI, SQLAlchemy 2, pytest, Vitest + Testing Library.

## Global Constraints

- Light-mode apenas. Paleta em `apps/web/src/styles/tokens.css`; acento `#0E7490`.
- Textos de interface em português do Brasil.
- Componentes novos vão em `apps/web/src/components/shadcn/`, importados via alias `@/`.
- Regras de `<a>` vivem em `@layer base` — utilitário do Tailwind precisa vencer. Não mover para fora do layer.
- IDs são UUID (string no TypeScript). Nunca `Number(id)`.
- Nenhum teste toca a rede.
- Rodar `npx tsc -b --noEmit` antes de cada commit do frontend.

---

## Estrutura de arquivos

**Criar**
- `apps/web/src/components/shadcn/select.tsx` — reescrito sobre Radix (substitui o `<select>` nativo estilizado)
- `apps/web/src/components/shadcn/dialog.tsx` — Dialog do Radix
- `apps/web/src/components/public/AnimalGallery.tsx` — foto principal + miniaturas
- `apps/web/src/components/public/HealthBadges.tsx` — selos derivados
- `apps/web/src/components/public/RelatedAnimals.tsx` — faixa de outros animais da ONG
- `apps/api/app/services/health_status.py` — derivação dos selos

**Modificar**
- `apps/api/app/schemas/animal.py` — `PublicAnimalResponse` ganha os campos derivados
- `apps/api/app/routers/public.py` — preenche os campos; `list_public_animals` ganha `exclude`
- `apps/web/src/pages/public/AnimalPublicPage.tsx` — reescrita no layout A
- `apps/web/src/pages/admin/AnimalFormPage.tsx` — passa a usar os componentes shadcn
- `apps/web/src/lib/publicApi.ts` — parâmetro `exclude`

**Remover ao final da Task 7**
- `apps/web/src/components/ui/Select.tsx`, `Modal.tsx` + `Modal.module.css`

---

### Task 1: Select do Radix

**Files:**
- Modify: `apps/web/src/components/shadcn/select.tsx`
- Create: `apps/web/src/components/shadcn/select.test.tsx`
- Modify: `apps/web/package.json`

**Interfaces:**
- Produces: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` — API do shadcn. `Select` recebe `value: string`, `onValueChange: (v: string) => void`.

- [ ] **Step 1: Instalar a dependência**

```bash
cd apps/web && npm install @radix-ui/react-select
```

- [ ] **Step 2: Escrever o teste que falha**

Criar `apps/web/src/components/shadcn/select.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

function Harness() {
  const [value, setValue] = useState("cão");
  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger aria-label="Espécie"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="cão">Cão</SelectItem>
        <SelectItem value="gato">Gato</SelectItem>
      </SelectContent>
    </Select>
  );
}

test("mostra o rótulo do valor escolhido, não o valor cru", async () => {
  render(<Harness />);
  expect(screen.getByLabelText("Espécie")).toHaveTextContent("Cão");
});

test("troca o valor ao escolher outra opção", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByLabelText("Espécie"));
  await user.click(await screen.findByRole("option", { name: "Gato" }));
  expect(screen.getByLabelText("Espécie")).toHaveTextContent("Gato");
});
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `cd apps/web && npx vitest run src/components/shadcn/select.test.tsx`
Expected: FAIL — `SelectTrigger` não é exportado.

- [ ] **Step 4: Implementar**

Substituir todo o conteúdo de `apps/web/src/components/shadcn/select.tsx`:

```tsx
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-11 w-full items-center justify-between rounded-md border border-input",
      "bg-card px-3 text-sm text-foreground",
      "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon aria-hidden className="ml-2 text-muted-foreground">▾</SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position="popper"
      sideOffset={4}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border border-border",
        "bg-popover text-popover-foreground shadow-md",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm",
      "py-2 pl-3 pr-8 text-sm outline-none",
      "focus:bg-accent focus:text-accent-foreground data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd apps/web && npx vitest run src/components/shadcn/select.test.tsx`
Expected: PASS (2 testes)

Se o segundo teste falhar com erro de `scrollIntoView` ou `PointerEvent`, é limitação conhecida do jsdom com Radix. Adicionar em `apps/web/src/setupTests.ts`:

```ts
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {};
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/src/components/shadcn/select.tsx apps/web/src/components/shadcn/select.test.tsx apps/web/src/setupTests.ts
git commit -m "feat(web): substitui o select nativo pelo componente Radix"
```

---

### Task 2: Dialog do Radix e o botão centralizado

**Files:**
- Create: `apps/web/src/components/shadcn/dialog.tsx`
- Modify: `apps/web/src/pages/public/AnimalPublicPage.tsx` (só o `InterestModal`)
- Create: `apps/web/src/pages/public/InterestModal.test.tsx`

**Interfaces:**
- Consumes: `Select…` da Task 1.
- Produces: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`.

O `Modal` atual não prende o foco, não fecha no Escape e não trava o scroll do fundo. O Radix resolve os três de graça.

- [ ] **Step 1: Instalar**

```bash
cd apps/web && npm install @radix-ui/react-dialog
```

- [ ] **Step 2: Escrever o teste que falha**

Criar `apps/web/src/pages/public/InterestModal.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { InterestModal } from "./AnimalPublicPage";

test("o botão de enviar fica no rodapé centralizado", () => {
  render(<InterestModal open onClose={() => {}} animalId="abc" animalName="Mel" />);
  const footer = screen.getByTestId("interest-footer");
  expect(footer).toHaveClass("justify-center");
  expect(footer).toContainElement(screen.getByRole("button", { name: /enviar solicitação/i }));
});

test("o título nomeia o animal", () => {
  render(<InterestModal open onClose={() => {}} animalId="abc" animalName="Mel" />);
  expect(screen.getByRole("dialog")).toHaveAccessibleName(/interesse em mel/i);
});
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `cd apps/web && npx vitest run src/pages/public/InterestModal.test.tsx`
Expected: FAIL — `InterestModal` não é exportado.

- [ ] **Step 4: Criar o Dialog**

Criar `apps/web/src/components/shadcn/dialog.tsx`:

```tsx
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/45" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
        "max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-lg",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        aria-label="Fechar"
        className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
      >
        ✕
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-border px-6 py-4", className)} {...props} />;
}

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-base font-semibold", className)} {...props} />
));
DialogTitle.displayName = "DialogTitle";

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex justify-center px-6 pb-6 pt-2", className)} {...props} />;
}
```

- [ ] **Step 5: Reescrever o InterestModal**

Em `apps/web/src/pages/public/AnimalPublicPage.tsx`, exportar e substituir a função `InterestModal`. Trocar os imports de `Modal`, `Select` e `Field` pelos novos, e o corpo por:

```tsx
export function InterestModal({ open, onClose, animalId, animalName }: {
  open: boolean; onClose: () => void; animalId: string; animalName: string;
}) {
  const [type, setType] = useState<SupportType>("adoção");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await publicApi.createSupportRequest({
        animal_id: animalId,
        type,
        requester_name: name,
        requester_email: email,
        requester_phone: phone || undefined,
        message: message || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Interesse em {animalName}</DialogTitle></DialogHeader>
        {done ? (
          <>
            <div className="px-6 py-6 text-sm">
              Solicitação enviada. O abrigo entra em contato pelo e-mail informado.
            </div>
            <DialogFooter data-testid="interest-footer">
              <Button onClick={onClose}>Fechar</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="flex flex-col gap-4 px-6 py-5">
              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tipo">Tipo de apoio</Label>
                <Select value={type} onValueChange={(v) => setType(v as SupportType)}>
                  <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nome">Seu nome</Label>
                <Input id="nome" value={name} onChange={(e) => setName(e.target.value)} required
                       placeholder="Como podemos te chamar" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                       required placeholder="voce@email.com" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tel">Telefone</Label>
                <Input id="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                       placeholder="(83) 90000-0000" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="msg">Mensagem</Label>
                <Input id="msg" value={message} onChange={(e) => setMessage(e.target.value)}
                       placeholder="Conte um pouco sobre você e sua casa" />
              </div>
            </div>
            <DialogFooter data-testid="interest-footer">
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? "Enviando…" : "Enviar solicitação"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

Imports a acrescentar no topo do arquivo:

```tsx
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `cd apps/web && npx vitest run src/pages/public/InterestModal.test.tsx && npx tsc -b --noEmit`
Expected: PASS (2 testes), TypeScript sem erros.

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/src/components/shadcn/dialog.tsx apps/web/src/pages/public/
git commit -m "feat(web): modal de interesse no Dialog do Radix com botão centralizado"
```

---

### Task 3: Selos de saúde no backend

**Files:**
- Create: `apps/api/app/services/health_status.py`
- Create: `apps/api/tests/test_health_status.py`
- Modify: `apps/api/app/schemas/animal.py`
- Modify: `apps/api/app/routers/public.py:42-47`

**Interfaces:**
- Produces: `compute_health_status(db, animal_id, today=None) -> HealthStatus`, um dataclass com `vaccines_up_to_date: bool | None` e `under_treatment: bool`. `PublicAnimalResponse` ganha os dois campos com os mesmos nomes.

Regras, derivadas do que os dados sustentam hoje:

- `vaccines_up_to_date` é `None` quando o animal não tem nenhuma vacina registrada — sem registro não dá para afirmar nada. É `False` se existe vacina com `applied_at` nulo e `due_at` anterior a hoje. Caso contrário, `True`.
- `under_treatment` é `True` quando existe medicação com `status == "ativa"`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/api/tests/test_health_status.py`:

```python
from datetime import date, timedelta

from app.models import Animal, Medication, Organization, Vaccination
from app.services.health_status import compute_health_status

TODAY = date(2026, 8, 5)


def _animal(db):
    org = Organization(name="Abrigo", slug=f"abrigo-{id(db)}")
    db.add(org)
    db.flush()
    animal = Animal(org_id=org.id, name="Mel", species="cão")
    db.add(animal)
    db.flush()
    return animal


def test_sem_vacina_registrada_nao_afirma_nada(db_session):
    animal = _animal(db_session)
    status = compute_health_status(db_session, animal.id, today=TODAY)
    assert status.vaccines_up_to_date is None
    assert status.under_treatment is False


def test_vacina_vencida_e_nao_aplicada_reprova(db_session):
    animal = _animal(db_session)
    db_session.add(Vaccination(animal_id=animal.id, vaccine_name="V10",
                               due_at=TODAY - timedelta(days=1)))
    db_session.flush()
    assert compute_health_status(db_session, animal.id, today=TODAY).vaccines_up_to_date is False


def test_vacina_aplicada_conta_como_em_dia(db_session):
    animal = _animal(db_session)
    db_session.add(Vaccination(animal_id=animal.id, vaccine_name="V10",
                               applied_at=TODAY - timedelta(days=30),
                               due_at=TODAY - timedelta(days=1)))
    db_session.flush()
    assert compute_health_status(db_session, animal.id, today=TODAY).vaccines_up_to_date is True


def test_vacina_com_vencimento_futuro_conta_como_em_dia(db_session):
    animal = _animal(db_session)
    db_session.add(Vaccination(animal_id=animal.id, vaccine_name="V10",
                               due_at=TODAY + timedelta(days=10)))
    db_session.flush()
    assert compute_health_status(db_session, animal.id, today=TODAY).vaccines_up_to_date is True


def test_medicacao_ativa_marca_tratamento(db_session):
    animal = _animal(db_session)
    db_session.add(Medication(animal_id=animal.id, name="Antibiótico", status="ativa"))
    db_session.flush()
    assert compute_health_status(db_session, animal.id, today=TODAY).under_treatment is True


def test_medicacao_concluida_nao_marca_tratamento(db_session):
    animal = _animal(db_session)
    db_session.add(Medication(animal_id=animal.id, name="Antibiótico", status="concluída"))
    db_session.flush()
    assert compute_health_status(db_session, animal.id, today=TODAY).under_treatment is False
```

Se `conftest.py` ainda não expuser uma fixture `db_session`, acrescentar:

```python
@pytest.fixture
def db_session(client):
    from app.db.session import SessionLocal
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_health_status.py -v`
Expected: FAIL — `ModuleNotFoundError: app.services.health_status`

- [ ] **Step 3: Implementar o serviço**

Criar `apps/api/app/services/health_status.py`:

```python
from dataclasses import dataclass
from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Medication, Vaccination


@dataclass(frozen=True)
class HealthStatus:
    """Sinais públicos de saúde. Sem datas nem nome de doença — o adotante
    precisa de confiança, não de prontuário."""

    vaccines_up_to_date: bool | None
    under_treatment: bool


def compute_health_status(
    db: Session, animal_id: UUID, today: date | None = None
) -> HealthStatus:
    today = today or date.today()

    total_vaccines = db.scalar(
        select(Vaccination).where(Vaccination.animal_id == animal_id).limit(1)
    )
    if total_vaccines is None:
        up_to_date: bool | None = None
    else:
        overdue = db.scalar(
            select(Vaccination)
            .where(
                Vaccination.animal_id == animal_id,
                Vaccination.applied_at.is_(None),
                Vaccination.due_at.is_not(None),
                Vaccination.due_at < today,
            )
            .limit(1)
        )
        up_to_date = overdue is None

    active_med = db.scalar(
        select(Medication)
        .where(Medication.animal_id == animal_id, Medication.status == "ativa")
        .limit(1)
    )

    return HealthStatus(vaccines_up_to_date=up_to_date, under_treatment=active_med is not None)
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_health_status.py -v`
Expected: PASS (6 testes)

- [ ] **Step 5: Expor no response público**

Em `apps/api/app/schemas/animal.py`, acrescentar ao `PublicAnimalResponse`:

```python
    vaccines_up_to_date: bool | None = None
    under_treatment: bool = False
```

Em `apps/api/app/routers/public.py`, trocar `get_public_animal`:

```python
@router.get("/animals/{animal_id}", response_model=PublicAnimalResponse)
def get_public_animal(animal_id: UUID, db: Session = Depends(get_db)) -> PublicAnimalResponse:
    animal = db.get(Animal, animal_id)
    if animal is None or animal.status != "disponível":
        raise HTTPException(status_code=404, detail="Animal não encontrado")
    status = compute_health_status(db, animal.id)
    return PublicAnimalResponse.model_validate(
        animal, from_attributes=True
    ).model_copy(update={
        "vaccines_up_to_date": status.vaccines_up_to_date,
        "under_treatment": status.under_treatment,
    })
```

Import a acrescentar: `from app.services.health_status import compute_health_status`

Os selos ficam apenas no detalhe. A listagem não os calcula — seriam N consultas para uma informação que o card não mostra.

- [ ] **Step 6: Teste de integração**

Acrescentar a `apps/api/tests/test_public_org.py`:

```python
def test_detalhe_publico_traz_os_sinais_de_saude(client):
    resp = client.get("/api/public/animals")
    animals = resp.json()
    assert animals, "seed precisa de ao menos um animal disponível"
    detail = client.get(f"/api/public/animals/{animals[0]['id']}").json()
    assert "vaccines_up_to_date" in detail
    assert "under_treatment" in detail
```

- [ ] **Step 7: Rodar tudo**

Run: `cd apps/api && .venv/bin/python -m pytest -q`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/api/app/services/health_status.py apps/api/app/schemas/animal.py apps/api/app/routers/public.py apps/api/tests/
git commit -m "feat(api): deriva sinais públicos de vacinação e tratamento"
```

---

### Task 4: Galeria

**Files:**
- Create: `apps/web/src/components/public/AnimalGallery.tsx`
- Create: `apps/web/src/components/public/AnimalGallery.test.tsx`

**Interfaces:**
- Produces: `AnimalGallery({ photos: string[]; name: string })`. Recebe uma lista já pronta; no plano das fotos ela passa a ter mais de um item sem alteração no componente.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/web && npx vitest run src/components/public/AnimalGallery.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

```tsx
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AnimalGallery({ photos, name }: { photos: string[]; name: string }) {
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return (
      <div
        data-testid="gallery-empty"
        className="grid aspect-[4/3] place-items-center rounded-xl border border-border bg-card text-6xl"
      >
        🐾
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <img
        data-testid="gallery-main"
        src={photos[active]}
        alt={`Foto de ${name}`}
        className="aspect-[4/3] w-full rounded-xl border border-border object-cover"
      />
      {photos.length > 1 && (
        <div className="grid grid-cols-4 gap-2.5">
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Ver foto ${i + 1} de ${name}`}
              aria-current={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "aspect-square overflow-hidden rounded-md border",
                i === active ? "border-2 border-primary" : "border-border",
              )}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/web && npx vitest run src/components/public/AnimalGallery.test.tsx`
Expected: PASS (3 testes)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/public/
git commit -m "feat(web): componente de galeria do animal"
```

---

### Task 5: Selos no frontend e relacionados

**Files:**
- Create: `apps/web/src/components/public/HealthBadges.tsx`
- Create: `apps/web/src/components/public/HealthBadges.test.tsx`
- Create: `apps/web/src/components/public/RelatedAnimals.tsx`
- Modify: `apps/web/src/lib/publicApi.ts`
- Modify: `apps/web/src/lib/types.ts`

**Interfaces:**
- Consumes: `vaccines_up_to_date` e `under_treatment` da Task 3.
- Produces: `HealthBadges({ upToDate, underTreatment })`, `RelatedAnimals({ orgSlug, orgName, excludeId })`.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
import { render, screen } from "@testing-library/react";
import { HealthBadges } from "./HealthBadges";

test("não mostra selo de vacina quando não há registro", () => {
  render(<HealthBadges upToDate={null} underTreatment={false} />);
  expect(screen.queryByText(/vacina/i)).not.toBeInTheDocument();
});

test("mostra vacinação em dia", () => {
  render(<HealthBadges upToDate underTreatment={false} />);
  expect(screen.getByText("Vacinação em dia")).toBeInTheDocument();
});

test("mostra vacinação pendente quando há vacina vencida", () => {
  render(<HealthBadges upToDate={false} underTreatment={false} />);
  expect(screen.getByText("Vacinação pendente")).toBeInTheDocument();
});

test("mostra tratamento em curso", () => {
  render(<HealthBadges upToDate={null} underTreatment />);
  expect(screen.getByText("Em tratamento")).toBeInTheDocument();
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/web && npx vitest run src/components/public/HealthBadges.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar os selos**

```tsx
const base = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold";

export function HealthBadges({ upToDate, underTreatment }: {
  upToDate: boolean | null;
  underTreatment: boolean;
}) {
  if (upToDate === null && !underTreatment) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {upToDate === true && (
        <span className={`${base} border-emerald-200 bg-emerald-50 text-emerald-700`}>
          ✓ Vacinação em dia
        </span>
      )}
      {upToDate === false && (
        <span className={`${base} border-amber-200 bg-amber-50 text-amber-700`}>
          Vacinação pendente
        </span>
      )}
      {underTreatment && (
        <span className={`${base} border-amber-200 bg-amber-50 text-amber-700`}>
          Em tratamento
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/web && npx vitest run src/components/public/HealthBadges.test.tsx`
Expected: PASS (4 testes)

- [ ] **Step 5: Relacionados**

Em `apps/web/src/lib/types.ts`, acrescentar a `PublicAnimal`:

```ts
  vaccines_up_to_date: boolean | null;
  under_treatment: boolean;
```

Em `apps/web/src/lib/publicApi.ts`, `listAnimals` já aceita filtros por query. Reaproveitar com `org`, filtrando o animal atual no cliente — a lista de uma ONG é pequena e não justifica um parâmetro novo na API.

Criar `apps/web/src/components/public/RelatedAnimals.tsx`:

```tsx
import { Link } from "react-router-dom";
import { publicApi } from "@/lib/publicApi";
import { useAsync } from "@/lib/useAsync";
import { AnimalCard } from "@/components/AnimalCard";

export function RelatedAnimals({ orgSlug, orgName, excludeId }: {
  orgSlug: string; orgName: string; excludeId: string;
}) {
  const { data } = useAsync(() => publicApi.listAnimals({ org: orgSlug }), [orgSlug]);
  const others = (data ?? []).filter((a) => a.id !== excludeId).slice(0, 4);
  if (others.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Outros animais do {orgName}</h2>
        <Link to={`/ongs/${orgSlug}`} className="text-sm text-primary">Ver todos</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {others.map((a) => <AnimalCard key={a.id} animal={a} />)}
      </div>
    </section>
  );
}
```

As assinaturas já batem com o código atual: `publicApi.listAnimals(filters)` aceita
`{ org }` (ver `VitrineFilters` em `lib/publicApi.ts`) e `AnimalCard` recebe
`{ animal }`. Nada a adaptar.

- [ ] **Step 6: Rodar tudo e commitar**

```bash
cd apps/web && npx tsc -b --noEmit && npx vitest run
git add apps/web/src/components/public/ apps/web/src/lib/
git commit -m "feat(web): selos de saúde e faixa de animais relacionados"
```

---

### Task 6: Página do animal no layout A

**Files:**
- Modify: `apps/web/src/pages/public/AnimalPublicPage.tsx`
- Create: `apps/web/src/pages/public/AnimalPublicPage.test.tsx`

**Interfaces:**
- Consumes: `AnimalGallery` (Task 4), `HealthBadges` e `RelatedAnimals` (Task 5), `InterestModal` (Task 2).

- [ ] **Step 1: Escrever o teste que falha**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import * as publicApi from "@/lib/publicApi";
import { AnimalPublicPage } from "./AnimalPublicPage";

const MEL = {
  id: "44444444-4444-4444-8444-444444444444",
  name: "Mel", species: "cão", breed: "Labrador", sex: "fêmea", size: "M",
  birth_estimate: "1 ano", description: "Cheia de energia.", photo_url: "/mel.jpg",
  org_id: "22222222-2222-4222-8222-222222222222", org_name: "Abrigo Amigo Fiel",
  org_city: "João Pessoa", org_slug: "abrigo-amigo-fiel",
  vaccines_up_to_date: true, under_treatment: false,
};

function renderPage() {
  vi.spyOn(publicApi.publicApi, "getAnimal").mockResolvedValue(MEL as never);
  vi.spyOn(publicApi.publicApi, "listAnimals").mockResolvedValue([MEL] as never);
  render(
    <MemoryRouter initialEntries={[`/animais/${MEL.id}`]}>
      <Routes><Route path="/animais/:id" element={<AnimalPublicPage />} /></Routes>
    </MemoryRouter>,
  );
}

test("mostra nome, características e o selo de vacinação", async () => {
  renderPage();
  expect(await screen.findByRole("heading", { name: "Mel" })).toBeInTheDocument();
  expect(screen.getByText("Labrador")).toBeInTheDocument();
  expect(screen.getByText("Vacinação em dia")).toBeInTheDocument();
});

test("o botão de interesse ocupa o painel inteiro", async () => {
  renderPage();
  const cta = await screen.findByRole("button", { name: /tenho interesse/i });
  expect(cta).toHaveClass("w-full");
});

test("liga para o perfil da ONG", async () => {
  renderPage();
  await waitFor(() =>
    expect(screen.getByRole("link", { name: /abrigo amigo fiel/i }))
      .toHaveAttribute("href", "/ongs/abrigo-amigo-fiel"),
  );
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/web && npx vitest run src/pages/public/AnimalPublicPage.test.tsx`
Expected: FAIL — o CTA não tem `w-full` e não existe selo.

- [ ] **Step 3: Reescrever a página**

Substituir o componente `AnimalPublicPage` (mantendo o `InterestModal` da Task 2 no mesmo arquivo):

```tsx
export function AnimalPublicPage() {
  const { id } = useParams();
  const animalId = id ?? "";
  const { data, loading, error } = useAsync(() => publicApi.getAnimal(animalId), [animalId]);
  const [open, setOpen] = useState(false);

  if (loading) return <p className="py-16 text-center text-muted-foreground">Carregando…</p>;
  if (error || !data) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Este animal não está mais disponível.</p>
        <Button asChild variant="secondary" className="mt-4"><Link to="/animais">Ver a vitrine</Link></Button>
      </div>
    );
  }

  const traits = [data.species, data.breed, data.sex, data.size && `porte ${data.size}`, data.birth_estimate]
    .filter(Boolean) as string[];

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        <Link to="/animais" className="hover:text-primary">Animais</Link> › {data.name}
      </p>

      <div className="grid items-start gap-7 md:grid-cols-[1.15fr_.85fr]">
        <AnimalGallery photos={data.photo_url ? [data.photo_url] : []} name={data.name} />

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm md:sticky md:top-24">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {traits.map((t) => (
                <span key={t} className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <HealthBadges upToDate={data.vaccines_up_to_date} underTreatment={data.under_treatment} />

          <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-gradient-to-br from-primary to-[#14b8a6] text-white">🏠</span>
            <span className="text-sm">
              <Link to={`/ongs/${data.org_slug}`} className="font-semibold">{data.org_name}</Link>
              {data.org_city && <span className="block text-xs text-muted-foreground">{data.org_city}</span>}
            </span>
          </div>

          <div className="h-px bg-border" />

          <Button size="lg" className="w-full" onClick={() => setOpen(true)}>Tenho interesse</Button>
          <p className="text-center text-xs text-muted-foreground">
            Sem compromisso — o abrigo entra em contato
          </p>
        </div>
      </div>

      {data.description && (
        <div className="mt-7 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 text-base font-semibold">Sobre {data.name}</h2>
          <p className="max-w-[70ch] text-sm leading-relaxed text-muted-foreground">{data.description}</p>
        </div>
      )}

      <RelatedAnimals orgSlug={data.org_slug} orgName={data.org_name} excludeId={data.id} />

      <InterestModal open={open} onClose={() => setOpen(false)} animalId={animalId} animalName={data.name} />
    </div>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/web && npx vitest run src/pages/public/AnimalPublicPage.test.tsx && npx tsc -b --noEmit`
Expected: PASS (3 testes)

- [ ] **Step 5: Conferir no navegador**

```bash
docker compose up -d
```

Abrir `http://localhost:5173/animais`, entrar num animal e verificar: painel gruda no scroll, CTA em largura total, selo de vacinação, faixa de relacionados, modal abre e fecha no Escape.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/public/
git commit -m "feat(web): página do animal no layout de duas colunas com painel fixo"
```

---

### Task 7: Terminar a migração para shadcn

**Files:**
- Modify: `apps/web/src/pages/admin/AnimalFormPage.tsx`
- Delete: `apps/web/src/components/ui/Select.tsx`, `Modal.tsx`, `Modal.module.css`

- [ ] **Step 1: Migrar o formulário do animal**

Trocar cada `<Select label="X" options={OPTS} value={v} onChange={…} />` por:

```tsx
<div className="flex flex-col gap-1.5">
  <Label htmlFor="especie">Espécie</Label>
  <Select value={form.species} onValueChange={(v) => set("species", v)}>
    <SelectTrigger id="especie"><SelectValue /></SelectTrigger>
    <SelectContent>
      {SPECIES_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
    </SelectContent>
  </Select>
</div>
```

Repetir para Sexo (`SEX_OPTIONS`), Porte (`SIZE_OPTIONS`) e Situação (`ANIMAL_STATUS_OPTIONS`). Trocar `Field` por `Label` + `Input`, e `Button` por `@/components/shadcn/button`.

Atenção: o `Select` do Radix não aceita `value=""`. Para Sexo e Porte, que são opcionais, usar o sentinela `"—"` e converter na hora de salvar:

```tsx
const NONE = "—";
// ao ler:  value={form.sex ?? NONE}
// ao salvar: sex: form.sex === NONE ? null : form.sex
```

- [ ] **Step 2: Confirmar que nada mais importa os componentes antigos**

```bash
cd apps/web && grep -rn "components/ui/Select\|components/ui/Modal" src/ || echo "nenhum"
```

- [ ] **Step 3: Remover os órfãos**

```bash
cd apps/web && rm src/components/ui/Select.tsx src/components/ui/Modal.tsx src/components/ui/Modal.module.css
```

- [ ] **Step 4: Verificação completa**

```bash
cd apps/web && npx tsc -b --noEmit && npx vitest run
cd ../api && .venv/bin/python -m pytest -q
```
Expected: tudo passando.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(web): formulário do animal em shadcn e remoção dos componentes antigos"
```

---

## Fora deste plano

As fotos múltiplas seguem o spec `docs/superpowers/specs/2026-08-04-animal-photos-and-storage-design.md` e viram um plano próprio. A `AnimalGallery` já recebe uma lista, então passar de uma para quatro fotos não altera o layout — troca-se apenas o que alimenta a prop.
