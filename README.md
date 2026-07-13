# CNPJ Lookup

Frontend React standalone para consultar CNPJs diretamente na API pública
[`publica.cnpj.ws`](https://publica.cnpj.ws). Sem backend, sem chave de API,
sem cadastro — abre no navegador, digita o CNPJ e pronto.

---

## O que faz

- **Consulta direta** à API `https://publica.cnpj.ws/cnpj/{cnpj}` direto do navegador (a API é aberta e não exige chave).
- **Campo de CNPJ com máscara automática** que valida os 14 dígitos e só habilita o botão "Consultar" quando completo.
- **Resumo "bonito"** com os campos principais: razão social, nome fantasia, situação cadastral, data da situação, capital social (em `R$`), endereço completo (logradouro/número/complemento, bairro, cidade, UF, CEP), CNAE fiscal + atividade principal, telefones formatados, e-mail e inscrições estaduais (em chips).
- **Renderização dinâmica de todos os campos** que a API devolveu — incluindo listas de objetos aninhadados (ex.: o array `Socios` do CNPJ raiz do Banco do Brasil tem 46 itens, cada um com CPF/CNPJ, nome, tipo, data de entrada, faixa etária, qualificação, sub-objeto `Pais`, etc.). Tudo é caminhado recursivamente: primitivos viram linhas de tabela, objetos viram blocos colapsáveis com sub-tabela e arrays viram pilhas de cards.
- **Formatação automática por chave**: CNPJ → `00.000.000/0001-91`, CEP → `00000-000`, telefones → `(11) 99999-9999`, datas ISO → `26/01/2023`, capital social → `R$ 120.000.000.000,00`, booleanos → `Sim`/`Não`.
- **Botão "Ver JSON bruto"** que abre/fecha a resposta formatada com `JSON.stringify(data, null, 2)` num `<pre>` com scroll.
- **Botão "Copiar JSON"** que joga a mesma resposta no clipboard (com confirmação visual "Copiado ✓").
- **Contador de campos preenchidos** que caminha pela estrutura inteira contando só os valores não-vazios (ignora strings vazias, `null` e `undefined`, mas conta mesmo os que estão dentro de arrays/objetos).
- **Layout responsivo** — empilha no mobile (375px), divide em duas colunas a partir de `sm:`, e centraliza o conteúdo em `max-w-3xl`.
- **Estados tratados**: input incompleto, 404, 429, erro de rede, JSON malformado — todos viram banner vermelho discreto com a mensagem específica.

---

## Stack

| Item | Por quê |
|---|---|
| React 19 + Vite 8 | Build rápido, HMR instantâneo, sem framework opinativo |
| TypeScript 5 (strict) | Garantir que a renderização dinâmica trata `unknown` direitinho |
| Tailwind CSS 3 | Estilização utilitária, paleta custom, sem precisar de CSS-in-JS |
| `Intl.NumberFormat` | Formatador nativo de moeda (BRL) — sem precisar de `react-intl` ou similar |
| Sem bibliotecas de ícone | Usa `<svg>` próprio (spinner) e caracteres Unicode (📇) — pediu pra não trazer deps |

Não tem: roteador (a página é única), state manager (não precisa), biblioteca de UI (Tailwind resolve), dependência de backend (a API pública é chamada direto).

---

## Estrutura de pastas

```
C:\API CNPJ\
├── .claude/launch.json               config opcional pro Claude Browser preview
├── .gitignore
├── index.html                        entrada única do Vite
├── package.json
├── postcss.config.js                 pipeline do Tailwind
├── tailwind.config.js                paleta custom (cores, fontes)
├── tsconfig.json                     strict, bundler resolution
├── vite.config.ts                    dev server em 127.0.0.1:5173
├── dist/                             (gerado) build de produção
├── node_modules/                     (gerado) deps
└── src/
    ├── vite-env.d.ts                 tipos do Vite
    ├── main.tsx                      StrictMode → <CnpjPage />
    ├── cnpj.css                      @tailwind + componentes utilitários
    └── cnpj/
        ├── api.ts                    fetchCnpj + classe CnpjApiError
        ├── formatters.ts             máscaras, formatadores, countFilled, humanizeKey
        ├── CnpjPage.tsx              tela principal: form, estados, ações
        ├── CnpjSummary.tsx           resumo fixo em formato definition list
        └── JsonValue.tsx             renderizador recursivo de QUALQUER JSON
```

### Detalhe dos módulos

#### `src/cnpj/formatters.ts`
Funções puras sem deps. Exporta:

- `onlyDigits(str)` → tira tudo que não é dígito.
- `maskCnpj(str)`, `maskCep(str)`, `maskPhone(str)` → aplica a máscara progressivamente conforme o usuário digita.
- `formatDate(value)` → reconhece `YYYY-MM-DD…` e devolve `DD/MM/YYYY`. Se não for data ISO, devolve o valor como veio.
- `formatCurrency(value)` → aceita número, `"1234.56"` ou `"1234,56"` e devolve `R$ 1.234,56` via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- `formatBoolean(value)` → aceita `true/false`, `0/1`, `"S"/"N"` e devolve `"Sim"`/`"Não"`.
- `autoFormat(key, value)` → decide automaticamente qual formatador usar baseado no nome da chave (`cnpj` aplica máscara de CNPJ, `cep` aplica CEP, `data_*` formata data, `capital_*` formata moeda, etc.).
- `countFilled(value)` → conta campos escalares não-vazios caminhando recursivamente em objetos e arrays.
- `humanizeKey(key)` → `"razao_social"` vira `"Razao Social"`, `"nomeFantasia"` vira `"Nome Fantasia"`.

#### `src/cnpj/api.ts`
Cliente HTTP isolado. Exporta:

- `CnpjApiError extends Error` → carrega o status HTTP pra erro customizado.
- `fetchCnpj(cnpjInput, signal?)` → valida 14 dígitos, monta a URL `https://publica.cnpj.ws/cnpj/{digits}`, faz `GET` com `Accept: application/json`, e trata:
  - `404` → `"CNPJ não encontrado na base pública."`
  - `429` → `"Limite de requisições excedido. Aguarde alguns segundos."`
  - qualquer outra `!ok` → `"Erro {status} ao consultar CNPJ."`
  - erro de rede (`fetch` rejeita) → `"Não foi possível contatar a API pública. Verifique sua conexão e tente novamente."`
  - JSON inválido → `"Resposta inválida da API pública (JSON malformado)."`

#### `src/cnpj/CnpjPage.tsx`
Tela principal. Mantém o estado de `input`, `data`, `loading`, `error`, `showRaw` e `copied`. Faz:

1. Controla o input, aplicando `maskCnpj` on-the-fly via `onChange`.
2. Chama `fetchCnpj` no submit, com `setLoading(true)` antes e `finally` pra resetar.
3. Mostra skeleton/empty state quando não há dados nem erro.
4. Quando tem `data`, renderiza três seções em cards: **Resumo**, **Todos os campos** e (opcional) **JSON bruto** toggle.
5. Renderiza o cabeçalho com botão "Copiar JSON" usando `navigator.clipboard.writeText` (com fallback silencioso se o navegador bloquear).

#### `src/cnpj/CnpjSummary.tsx`
Pega o JSON bruto e extrai os campos importantes numa `<table class="cnpj-table">` (estilo definition list). Lida com variações de shape da API: telefone pode vir como array ou string, endereço pode vir embutido num objeto ou nos campos raiz (`municipio`/`uf`/`cep`), CNAE pode estar em `cnae_fiscal_descricao` ou em `atividade_principal[0]`, inscrições estaduais podem ser array de objetos ou string solta.

#### `src/cnpj/JsonValue.tsx`
O coração da renderização dinâmica. Componente recursivo:

- **Primitivo** → linha de tabela com a chave humanizada e o valor passado por `autoFormat`.
- **Array** → cabeçalho com badge de contagem + cards empilhados. Cada item-objeto vira um card com header `Item #N · X campos` e sub-tabela; item-array vira um card que renderiza cada filho recursivamente; item-primitivo vira um parágrafo simples.
- **Objeto** → vira um `<details>` colapsável, mostrando contagem de campos. Quando o usuário expande, vê os campos chave/valor formatados.

A profundidade é propagada por prop `depth`, então o CSS consegue aplicar layouts diferentes em raiz vs aninhados, sem montar/zonas infinitas.

#### `src/cnpj.css` (Tailwind)
Define `@layer base` (reseta a fonte, fundo `#f3f4f6`) e `@layer components` com as classes que a página usa: `.cnpj-card`, `.cnpj-input`, `.cnpj-btn-primary`, `.cnpj-btn-ghost`, `.cnpj-pill`, `.cnpj-table`, `.cnpj-label`, `.cnpj-key`, `.cnpj-value`. Tudo cabe numa camada de Tailwind pra ficar fácil de tunar.

---

## Como rodar

### Pré-requisitos

- Node 24+ (`node --version` deve dar `v24.x` ou maior).
- `pnpm` 10+. Se não tiver: `npm i -g pnpm`.

### Desenvolvimento

```bash
cd "C:\API CNPJ"
pnpm install        # primeira vez, ~5s
pnpm dev            # sobe Vite em http://127.0.0.1:5173
```

Abra o browser em `http://127.0.0.1:5173/`, digite um CNPJ válido e clique **Consultar**. HMR está ativo: editar qualquer arquivo em `src/` recarrega a página na hora.

### Build de produção

```bash
pnpm build
```

Isso roda `tsc --noEmit` (checagem de tipos) seguido de `vite build`. Saída em `dist/`:

- `dist/index.html` (~0.4 KB)
- `dist/assets/index-*.css` (~12 KB / 3 KB gzip)
- `dist/assets/index-*.js` (~205 KB / 64 KB gzip)

Sem source maps por padrão — pra gerar com `pnpm build --sourcemap` ou mudando o `vite.config.ts`.

### Preview da build

```bash
pnpm preview        # serve dist/ em http://127.0.0.1:5173
```

Útil pra testar a versão minificada antes de publicar.

### Checagem de tipos e lint

```bash
pnpm typecheck      # tsc --noEmit
```

O ESLint não está configurado por padrão (não vem no `package.json`), mas se quiser adicionar: `pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin` e crie `.eslintrc.cjs`. O `pnpm typecheck` já pega a maior parte do que importaria via lint de qualquer forma.

---

## Como usar

### No fluxo principal

1. Digite o CNPJ no campo — a máscara `00.000.000/0000-00` aparece automaticamente. Não precisa colar no formato, digitar `12345` já vai virando `12.345` progressivamente.
2. O contador `X/14 dígitos` mostra em tempo real. O botão **Consultar** só fica habilitado quando bate 14.
3. Clique em **Consultar**. Aparece um spinner no botão e, dependendo da resposta da API (geralmente < 2s), a página renderiza:
   - **Resumo** com os campos principais numa tabela limpa.
   - **Todos os campos retornados pela API** com tudo que veio no JSON, formatado e organizado.
4. Use **Ver JSON bruto** pra inspecionar a resposta crua. Use **Copiar JSON** pra jogar no clipboard.
5. O contador `N campos preenchidos` no canto superior do resultado mostra quantos valores não-vazios vieram.

### Exemplos de CNPJ pra testar

| CNPJ | Devolve |
|---|---|
| `00.000.000/0001-91` | Banco do Brasil S.A. — matriz com 46 sócios, capital R$ 120bi |
| `11.222.333/0001-81` | Bradesco — também retorna bastante coisa |
| `33.000.167/0001-01` | Petrobras — pode incluir endereço, telefones etc. |
| `11.111.111/1111-11` | Inválido — vai gerar banner "Erro 400 ao consultar CNPJ" |

> **Importante:** a `publica.cnpj.ws` é aberta mas **limitada em rate** (≈1 req/s por IP). Se começar a retornar 429, espere alguns segundos antes de consultar de novo. O app já trata esse caso com mensagem específica.

### API direta (programaticamente)

Se quiser usar as funções do projeto num outro app ou script, dá pra importar `fetchCnpj`:

```ts
import { fetchCnpj, CnpjApiError } from "./src/cnpj/api";

try {
  const data = await fetchCnpj("00000000000191");
  console.log(data);
} catch (err) {
  if (err instanceof CnpjApiError) console.error(err.status, err.message);
}
```

E os formatters são todos puros:

```ts
import { maskCnpj, formatCurrency, countFilled } from "./src/cnpj/formatters";

maskCnpj("00000000000191");      // "00.000.000/0001-91"
formatCurrency("120000000000");  // "R$ 120.000.000.000,00"
countFilled({ a: 1, b: "", c: null, d: [1, 2, "x"] });  // 4
```

---

## Decisões de projeto

### Por que não usar biblioteca de UI?
Mais um pacote pra manter atualizado e bundle maior sem necessidade. Tailwind cobre 100% do styling; a página é simples o bastante pra não precisar de design system.

### Por que a máscara no `onChange` em vez de máscara fixa?
A máscara progressiva é mais tolerante: o usuário pode apagar um dígito do meio e re-inserir sem resetar tudo. A versão que cria input `xx.xxx.xxx/xxxx-xx` direto trava quando o usuário cola de outro lugar.

### Por que `fetch` puro em vez de axios?
Pra economizar 14 KB de bundle. A API só precisa de `GET` + tratamento de erro — `fetch` cobre isso e o navegador moderno já aborta com `AbortSignal` se a página for fechada.

### Por que `intl/locale` em vez de `date-fns`?
Datas são só uma operação (`YYYY-MM-DD → DD/MM/YYYY`), capital social é só `Intl.NumberFormat`. Trazer `date-fns` adicionaria ~100 KB pra usar 1 função.

### Por que o renderizador dinâmico trata `unknown`?
A API pública não tem schema publicado formal e pode mudar. O renderizador recebe `unknown` e decide em runtime: isso evita ter que escrever tipos sincronizados com a API e ainda lida com campos novos sem quebrar.

### Por que a tabela de resumo em vez de cards?
Densidade. O resumo tem ~12 campos — em tabela você escaneia em 2 segundos olhando a coluna dos rótulos. Cards nesse volume seriam rolagem desnecessária.

---

## Possíveis evoluções

- **Cache local** das últimas N consultas (localStorage ou IndexedDB) pra não pagar o rate limit em consultas repetidas.
- **Histórico na UI** mostrando os últimos CNPJs consultados como chips clicáveis.
- **Exportar PDF** do resumo com layout print-friendly (`window.print()` + CSS `@media print`).
- **Validação de CNPJ** (dígitos verificadores) antes de mandar pra API — hoje só confere o tamanho.
- **PWA** com service worker pra cachear o bundle e permitir uso offline (com fallback pra mostrar últimos resultados salvos).
- **Múltiplas consultas em lote** colando uma lista de CNPJs e baixando um CSV.
- **i18n** pra EN/ES (hoje só PT).

---

## Licença & créditos

API consumida: [`publica.cnpj.ws`](https://publica.cnpj.ws) — use com responsabilidade, respeitando o rate limit.
Sem afiliação com a Receita Federal ou com as empresas consultadas.
