# Fotos de animais: upload, storage e carrossel

**Data:** 2026-08-04
**Status:** aprovado, aguardando plano de implementação

## Contexto

Hoje o animal tem um único campo `photo_url` (string), preenchido à mão com um link
externo. Duas consequências:

1. A ONG precisa hospedar a foto em outro lugar antes de cadastrar o animal.
2. A página pública do animal mostra uma imagem só, e fica visualmente vazia.

Este spec cobre a substituição desse campo por upload real com múltiplas fotos, o
serviço de storage por trás, e o carrossel que as consome na página pública.

## Escopo

**Dentro:** modelo `animal_photo`, serviço de storage, endpoints de upload/remoção/capa,
uploader no admin, carrossel na página pública, migração do seed.

**Fora (specs próprios):**

- Redesign da página do animal — layout A, selos de saúde derivados, faixa de animais
  relacionados. Depende deste spec para o carrossel.
- Migração dos componentes próprios para shadcn, incluindo `Select`.
- Preparação para deploy (Railway + Vercel): `CORS_ORIGINS`, `VITE_API_BASE`,
  normalização do `DATABASE_URL`, migrations no release.

## Contexto de produção

Uma única ONG, uso pequeno. API e Postgres no Railway, frontend na Vercel.

Isso descarta disco local: o filesystem do Railway é efêmero e as fotos sumiriam a cada
redeploy. Um Railway Volume resolveria, ao custo de configurar volume e ponto de
montagem, servir imagem pelo processo da API, sem CDN e sem backup.

## Decisões

### Storage: Supabase Storage via API S3

O código fala S3 (`boto3`) contra o endpoint S3-compatível do Supabase.

- Free tier de 1 GB, muito além do uso de uma ONG
- Sobrevive a redeploy e a troca de plataforma
- Entrega via CDN, sem gastar banda do Railway
- Sem lock-in: trocar para R2 ou S3 é mudar variáveis de ambiente

Custo aceito: exige conta, chaves no `.env` e internet para desenvolver.

### Interface de storage

Toda a integração fica atrás de uma classe pequena, para que a troca de fornecedor não
vaze para os routers:

```python
class Storage(Protocol):
    def save(self, upload: UploadFile) -> str: ...   # devolve storage_key
    def delete(self, key: str) -> None: ...
    def url(self, key: str) -> str: ...
```

Implementação `S3Storage` configurada por `STORAGE_BUCKET`, `STORAGE_ENDPOINT`,
`STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_PUBLIC_URL`.

### Nome de arquivo

A chave é sempre gerada no servidor: `animals/<uuid4>.<ext>`, com a extensão derivada do
content-type validado — nunca do nome enviado pelo cliente, que é vetor de path traversal.

## Modelo de dados

Nova tabela `animal_photo`:

| coluna | tipo | notas |
|---|---|---|
| `id` | uuid | PK |
| `animal_id` | uuid | FK → `animal.id`, `ON DELETE CASCADE` |
| `storage_key` | varchar(500) | chave no bucket, ou URL externa (ver seed) |
| `is_external` | boolean | `true` quando `storage_key` já é uma URL completa |
| `sort_order` | integer | menor valor = capa |
| `created_at` | timestamptz | |

A coluna `animal.photo_url` é removida. O campo continua existindo **no response
público**, derivado da capa — assim `AnimalCard`, a vitrine e a página da ONG não mudam.

A migration converte antes de dropar: cada `animal.photo_url` não nulo vira uma linha em
`animal_photo` com `is_external = true` e `sort_order = 0`. Nenhuma foto existente se
perde, e o `downgrade` reverte copiando a capa de volta para a coluna.

Máximo de 6 fotos por animal, validado na API.

## API

Todos sob autenticação da ONG dona do animal, seguindo o `_get_owned_animal` já existente.

| método | rota | efeito |
|---|---|---|
| `POST` | `/api/admin/animals/{id}/photos` | multipart; valida, envia ao storage, cria registro no fim da ordem |
| `DELETE` | `/api/admin/animals/{id}/photos/{photo_id}` | remove do storage e do banco |
| `PATCH` | `/api/admin/animals/{id}/photos/{photo_id}/cover` | move a foto para `sort_order` 0 |

Validação no upload: `image/jpeg`, `image/png`, `image/webp`, até 5 MB. Fora disso, 422
com mensagem em português. Sétima foto: 422.

O response público de animal ganha `photos: string[]` (URLs, em ordem) e mantém
`photo_url` como a primeira delas — `null` quando não há foto.

### Consistência entre banco e bucket

Upload grava no storage antes do banco; se o commit falhar, o objeto é removido no
`except`. Na remoção a ordem se inverte — apaga do banco e depois do storage — porque um
objeto órfão no bucket é barato, enquanto um registro apontando para objeto inexistente
quebra a página.

## Admin

O campo "URL da foto" no formulário do animal vira um uploader:

- Área de seleção de arquivo com preview antes de enviar
- Grade das fotos já enviadas, a capa marcada com um selo
- Ações por foto: remover, definir como capa
- Erro de validação exibido inline, sem perder o resto do formulário

Como o upload exige o animal já criado, no formulário de **novo** animal o uploader fica
desabilitado com a nota "salve o animal para adicionar fotos" — evita ter que segurar
arquivos em memória antes do `POST`.

## Página pública

Componente `AnimalGallery`: foto grande com miniaturas abaixo, clique troca a principal,
setas quando passa de 3. Com uma foto só, renderiza a imagem sem controles. Sem nenhuma,
o placeholder 🐾 atual.

Navegação por teclado (setas) e `alt` descritivo em cada imagem.

## Seed

As fotos de demonstração hoje são links do `placedog.net`. Baixá-las exigiria internet
para popular o banco.

Em vez disso, o seed cria registros com `is_external = true` e a URL completa em
`storage_key`; `url()` devolve esses valores intactos. O seed segue funcionando offline e
o mesmo caminho serve para migrar qualquer `photo_url` legado.

## Testes

**Backend**

- Upload aceita jpeg/png/webp e cria o registro com `sort_order` correto
- Upload rejeita content-type inválido e arquivo acima de 5 MB
- Upload rejeita a sétima foto
- Nome de arquivo malicioso (`../../etc/passwd`) não escapa do prefixo `animals/`
- ONG não consegue subir nem remover foto de animal de outra ONG (404)
- Remover animal remove as fotos em cascata
- `photo_url` do response público espelha a capa; `null` sem fotos
- `is_external` é devolvido sem alteração

O storage é dublado nos testes — nenhum teste toca a rede.

**Frontend**

- Galeria troca a imagem principal ao clicar na miniatura
- Uploader exibe erro de validação vindo da API
- Uploader desabilitado no formulário de criação

## Riscos

**Chaves do Supabase no `.env`.** O `.env` já é gitignorado e existe guard para
`SECRET_KEY` em produção. Vale estender o guard para as chaves de storage.

**Free tier.** 1 GB com 6 fotos por animal comporta centenas de animais. Se estourar, o
sintoma é erro no upload, não perda de dado.
