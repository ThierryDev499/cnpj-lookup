# Documentação da API `publica.cnpj.ws`

Esta página documenta o uso da API pública consumida por este projeto, com
exemplos prontos pra você copiar e adaptar em outros apps, scripts e testes.

---

## Visão geral

A API [`publica.cnpj.ws`](https://publica.cnpj.ws) expõe dados cadastrais de
empresas brasileiras (CNPJ). É aberta — **não exige autenticação nem chave** —
e responde em JSON. O rate-limit é compartilhado por IP (~1 req/s).

| | |
|---|---|
| URL base | `https://publica.cnpj.ws/cnpj/` |
| Método | `GET` |
| Formato | `application/json` |
| Headers | `Accept: application/json` (opcional) |
| Idempotente | sim (consulta, não muta nada) |
| Rate-limit | ~1 req/s por IP (limite aproximado) |

---

## Como executar o projeto

### Pré-requisitos

- **Node 24+** (`node --version` deve retornar `v24.x` ou maior).
- **pnpm 10+** (`npm i -g pnpm` se não tiver).

### Setup local

```bash
cd "C:\API CNPJ"
pnpm install
pnpm dev
```

O dev server sobe em `http://127.0.0.1:5173`. Edite qualquer arquivo em `src/`
e a página recarrega sozinha (HMR).

### Build de produção

```bash
pnpm build
```

Saída em `dist/` (HTML 0,4 KB, CSS 12 KB, JS 205 KB). É só subir essa pasta
no servidor de hospedagem que você já tem — não precisa de Node nem
configuração de servidor, é HTML/CSS/JS estático.

### Servir a build localmente

```bash
pnpm preview
```

Sobe um servidor estático em `http://127.0.0.1:5173` apontando pra `dist/`,
útil pra validar a versão minificada antes de subir.

---

## Como usar a API diretamente

A URL é construída a partir do CNPJ sem máscara, com 14 dígitos:

```
GET https://publica.cnpj.ws/cnpj/00000000000191
```

CNPJs com máscara (`00.000.000/0001-91`) **não** são aceitos — tire os
pontos, barra e traço antes de chamar.

### `curl` (terminal / shell)

```bash
curl -s -H "Accept: application/json" \
  https://publica.cnpj.ws/cnpj/00000000000191 | jq .
```

Sem o `jq`, mostra o JSON cru. Com `jq`, fica formatado. Pra pegar só um
campo:

```bash
curl -s https://publica.cnpj.ws/cnpj/00000000000191 \
  | jq -r '.razao_social'
# → "BANCO DO BRASIL SA"
```

Outros campos úteis:

```bash
# Capital social formatado em BRL
curl -s https://publica.cnpj.ws/cnpj/00000000000191 \
  | jq -r '.capital_social'

# Quantos sócios retornaram
curl -s https://publica.cnpj.ws/cnpj/00000000000191 \
  | jq '.socios | length'
# → 46
```

### Node.js (com `fetch` nativo)

```js
const cnpj = "00000000000191";

try {
  const res = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    console.error(`HTTP ${res.status}`);
    process.exit(1);
  }

  const json = await res.json();
  console.log(json.razao_social);    // "BANCO DO BRASIL SA"
  console.log(json.capital_social);  // "120000000000"
  console.log(json.socios.length);   // 46
} catch (err) {
  console.error("Falha:", err.message);
}
```

### Node.js (com a função do próprio projeto)

O projeto já exporta `fetchCnpj` e trata erros específicos. Pra usar:

```js
import { fetchCnpj, CnpjApiError } from "./src/cnpj/api";

try {
  const empresa = await fetchCnpj("00000000000191");
  console.log(empresa.razao_social);
} catch (err) {
  if (err instanceof CnpjApiError) {
    console.error("API respondeu:", err.status, err.message);
  } else {
    throw err;
  }
}
```

### Browser (JavaScript puro)

```html
<script>
  fetch("https://publica.cnpj.ws/cnpj/00000000000191")
    .then(r => r.json())
    .then(data => console.log(data.razao_social));
</script>
```

A API responde com `Access-Control-Allow-Origin: *`, então CORS não é problema.

### Python (com `requests`)

```python
import requests

cnpj = "00000000000191"
r = requests.get(
    f"https://publica.cnpj.ws/cnpj/{cnpj}",
    headers={"Accept": "application/json"},
    timeout=10,
)
r.raise_for_status()
data = r.json()
print(data["razao_social"])
```

Ou com `urllib` (sem deps):

```python
import json
import urllib.request

with urllib.request.urlopen(
    "https://publica.cnpj.ws/cnpj/00000000000191"
) as r:
    data = json.loads(r.read())
    print(data["razao_social"])
```

### PHP

```php
$cnpj = "00000000000191";
$json = file_get_contents("https://publica.cnpj.ws/cnpj/$cnpj");
$data = json_decode($json, true);
echo $data["razao_social"];
```

Em produção, troque `file_get_contents` por `curl` se precisar de mais
controle (timeout, headers, retry).

---

## Estrutura da resposta

A resposta é um JSON grande. Principais campos (todos opcionais — alguns
CNPJs não trazem todos):

### Campos raiz

| Campo | Tipo | Exemplo |
|---|---|---|
| `cnpj_raiz` | string | `"000000000"` (8 dígitos) |
| `razao_social` | string | `"BANCO DO BRASIL SA"` |
| `capital_social` | string (numérico) | `"120000000000"` |
| `responsavel_federativo` | string (booleano) | `""` |
| `atualizado_em` | string (ISO 8601) | `"2026-06-13T03:00:00.000Z"` |
| `porte` | objeto | `{ id: "05", descricao: "Demais" }` |
| `natureza_juridica` | objeto | `{ id: "2038", descricao: "Sociedade de Economia Mista" }` |
| `qualificacao_do_responsavel` | objeto | `{ id: "10", descricao: "Diretor" }` |
| `socios` | array | 46 objetos com dados de cada sócio |

### Estrutura de `socios[i]`

```json
{
  "cpf_cnpj_socio": "***128734***",
  "nome": "TARCIANA PAULA GOMES MEDEIROS",
  "tipo": "Pessoa Física",
  "data_entrada": "2023-01-26",
  "cpf_representante_legal": "***000000**",
  "nome_representante": null,
  "faixa_etaria": "41 a 50 anos",
  "atualizado_em": "2026-06-13T03:00:00.000Z",
  "pais_id": "1058",
  "qualificacao_socio": {
    "id": "16",
    "descricao": "Presidente"
  },
  "qualificacao_representante": null,
  "pais": {
    "id": "1058",
    "iso2": "BR",
    "iso3": "BRA",
    "nome": "Brasil",
    "comex_id": "105"
  }
}
```

Observe que a API devolve a string `***000000**` mascarando o CPF (privacidade).
Datas vêm em ISO 8601 (`YYYY-MM-DD` ou com hora). Capital social vem como
string numérica sem máscara (`"120000000000"` = R$ 120 bi).

---

## Códigos HTTP

| Status | Significado | Quando acontece |
|---|---|---|
| `200` | OK | CNPJ encontrado e retornou JSON |
| `400` | Bad Request | CNPJ não existe ou está inválido |
| `404` | Not Found | Mesmo acima (varia conforme versão da API) |
| `429` | Too Many Requests | Rate-limit estourou — espere alguns segundos |

Esse app já trata todos:

```ts
// src/cnpj/api.ts (resumo)
if (res.status === 404) throw new CnpjApiError("CNPJ não encontrado.", 404);
if (res.status === 429) throw new CnpjApiError("Limite de requisições.", 429);
if (!res.ok) throw new CnpjApiError(`Erro ${res.status}`, res.status);
```

---

## Idéias de uso em outros projetos

- **CRM / cadastro de fornecedores**: enriquecer um lead ao digitar o CNPJ,
  puxando razão social + endereço automaticamente.
- **Validação de blacklist**: cruzar a lista de CNPJs da sua empresa com a
  base pública.
- **Análise de portfólio**: baixar CNPJs em lote e cruzar porte, CNAE e
  capital social.
- **Pesquisa de mercado**: raspar CNPJs de uma região/segmento via CNAE.

---

## Limitações conhecidas da API

- **Rate-limit**: ~1 req/s por IP. Em produção com vários usuários,
  coloque cache ou um proxy.
- **Disponibilidade**: é serviço gratuito, então pode sair do ar em
  horários de pico.
- **Formato inconsistente**: como não há schema publicado, alguns CNPJs
  têm campos extras, aninhados de jeito diferente, ou faltando.
  Por isso o renderizador dinâmico deste app lida com `unknown` em vez
  de assumir schema.

---

## Licença & responsabilidade

A API pública `publica.cnpj.ws` é mantida por terceiros. Use com
responsabilidade e respeitando o rate-limit. Sem afiliação com a
Receita Federal ou com as empresas consultadas.
