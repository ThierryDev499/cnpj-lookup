import type { ReactNode } from "react";
import { autoFormat } from "./formatters";

type Endereco = {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  uf?: string;
  municipio?: string;
  cidade?: string;
  estado?: string;
};

type Estabelecimento = Endereco & {
  ddd1?: string;
  telefone1?: string;
  ddd2?: string;
  telefone2?: string;
  ddd_fax?: string;
  fax?: string;
  email?: string;
  nome_fantasia?: string;
  situacao_cadastral?: string;
  data_situacao_cadastral?: string;
  inscricoes_estaduais?: Array<{
    numero?: string;
    inscricao_estadual?: string;
    estado?: string | { sigla?: string; nome?: string };
  }>;
};

type Cnae = { codigo?: string | number; descricao?: string };

type CnpjJson = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  situacao?: string;
  data_situacao?: string;
  endereco?: Endereco;
  estabelecimento?: Estabelecimento;
  municipio?: string;
  uf?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  email?: string;
  telefones?: string[] | string;
  capital_social?: string | number;
  cnae_fiscal?: number | string;
  cnae_fiscal_descricao?: string;
  atividade_principal?: Cnae[];
  inscricoes_estaduais?: Array<{ numero?: string; estado?: string }> | string;
  [k: string]: unknown;
};

function formatTelefones(value: unknown): string {
  const parts: string[] = [];
  function pull(ddd: unknown, tel: unknown) {
    if (!tel) return;
    const num = String(tel);
    if (ddd) {
      const maskPhone = (d: string, n: string) => {
        const combined = `${d}${n}`;
        if (combined.length === 11) return `(${combined.slice(0, 2)}) ${combined.slice(2, 7)}-${combined.slice(7, 11)}`;
        if (combined.length === 10) return `(${combined.slice(0, 2)}) ${combined.slice(2, 6)}-${combined.slice(6, 10)}`;
        return `(${d}) ${n}`;
      };
      parts.push(maskPhone(String(ddd), num));
    } else {
      parts.push(num);
    }
  }
  if (Array.isArray(value)) {
    return value
      .map((t) => (typeof t === "string" || typeof t === "number" ? String(t) : ""))
      .filter(Boolean)
      .join(" · ");
  }
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const v = value as { ddd1?: string; telefone1?: string; ddd2?: string; telefone2?: string; ddd_fax?: string; fax?: string };
    pull(v.ddd1, v.telefone1);
    pull(v.ddd2, v.telefone2);
    pull(v.ddd_fax, v.fax);
    return parts.join(" · ");
  }
  return "";
}

/** Resumo em formato de definição (label/valor), padrão web. */
export function CnpjSummary({ data }: { data: unknown }) {
  const d = (data ?? {}) as CnpjJson;

  // Endereço pode vir em três lugares (em ordem de prioridade)
  // 1. objeto `estabelecimento` (o que esta API normalmente devolve)
  // 2. objeto `endereco` (alguns outros provedores de CNPJ)
  // 3. campos na raiz (logradouro/municipio/uf/cep)
  const est = (d.estabelecimento ?? {}) as Estabelecimento;
  const end = (d.endereco ?? {}) as Endereco;

  const cidadeObj = (est as unknown as { cidade?: { nome?: string } }).cidade;
  const estadoObj = (est as unknown as { estado?: { sigla?: string; nome?: string } }).estado;
  const municipioTxt =
    typeof cidadeObj === "object" && cidadeObj !== null
      ? cidadeObj.nome
      : typeof est.cidade === "string"
      ? est.cidade
      : undefined;
  const ufTxt =
    typeof estadoObj === "object" && estadoObj !== null
      ? estadoObj.sigla ?? estadoObj.nome
      : typeof est.estado === "string"
      ? est.estado
      : undefined;

  const fonteEndereco: Endereco = {
    logradouro: est.logradouro ?? end.logradouro ?? d.logradouro,
    numero: est.numero ?? end.numero,
    complemento: est.complemento ?? end.complemento,
    bairro: est.bairro ?? end.bairro,
    cep: est.cep ?? end.cep ?? d.cep,
    municipio: municipioTxt ?? est.municipio ?? end.municipio ?? d.municipio,
    uf: ufTxt ?? est.uf ?? end.uf ?? d.uf,
  };

  const tipoLogradouro =
    (est as unknown as { tipo_logradouro?: string }).tipo_logradouro ?? "";
  const logradouroFull = [
    tipoLogradouro,
    fonteEndereco.logradouro,
    fonteEndereco.numero ? `, ${fonteEndereco.numero}` : "",
    fonteEndereco.complemento ? ` — ${fonteEndereco.complemento}` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  // Nome fantasia / situação também podem estar em `estabelecimento`
  const nomeFantasia = d.nome_fantasia ?? est.nome_fantasia;
  const situacao = d.situacao ?? est.situacao_cadastral;
  const dataSituacao = d.data_situacao ?? est.data_situacao_cadastral;

  // Telefones e e-mail: objeto estabelecimento tem ddd1/telefone1/2; raiz tem telefone/email
  const email = d.email ?? est.email;
  const telefonesRaw = d.telefones ?? est;

  const cnaeDesc = d.cnae_fiscal_descricao ?? "";
  const cnaeCodigo = d.cnae_fiscal ?? "";
  const cnaeAtividade = d.atividade_principal?.[0];
  const incsRaw = (d.inscricoes_estaduais ?? est.inscricoes_estaduais) as
    | Array<{ numero?: string; inscricao_estadual?: string; estado?: string | { sigla?: string; nome?: string } }>
    | string
    | undefined;

  const rows: Array<[string, ReactNode]> = [
    ["Razão social", <strong key="rs" className="text-text">{d.razao_social || "—"}</strong>],
    ["Nome fantasia", valueOrEmpty(nomeFantasia)],
    ["Situação cadastral", valueOrEmpty(situacao)],
    ["Data da situação", valueOrEmpty(dataSituacao ? autoFormat("data_situacao", dataSituacao) : "")],
    [
      "Capital social",
      d.capital_social !== undefined && d.capital_social !== ""
        ? autoFormat("capital_social", d.capital_social)
        : "",
    ],
    [
      "Endereço",
      logradouroFull ||
      fonteEndereco.bairro ||
      fonteEndereco.municipio ||
      fonteEndereco.uf ||
      fonteEndereco.cep ? (
        <div className="flex flex-col gap-0.5">
          <span>{logradouroFull || "—"}</span>
          <span className="text-muted text-xs">
            {[fonteEndereco.bairro, fonteEndereco.municipio, fonteEndereco.uf]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {fonteEndereco.cep && (
            <span className="text-muted text-xs">CEP {autoFormat("cep", fonteEndereco.cep)}</span>
          )}
        </div>
      ) : (
        "—"
      ),
    ],
    [
      "CNAE fiscal",
      cnaeCodigo || cnaeDesc
        ? `${cnaeCodigo}${cnaeDesc ? ` — ${cnaeDesc}` : ""}`
        : "",
    ],
    [
      "Atividade principal",
      cnaeAtividade
        ? `${cnaeAtividade.codigo ?? ""}${cnaeAtividade.descricao ? ` — ${cnaeAtividade.descricao}` : ""}`
        : "",
    ],
    ["Telefone(s)", valueOrEmpty(formatTelefones(telefonesRaw))],
    ["E-mail", valueOrEmpty(email)],
    [
      "Inscrições estaduais",
      Array.isArray(incsRaw) && incsRaw.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {incsRaw.map((i, idx) => {
            const num = typeof i === "object" && i !== null ? i.numero ?? i.inscricao_estadual : undefined;
            const uf =
              typeof i === "object" && i !== null
                ? typeof i.estado === "object" && i.estado !== null
                  ? i.estado.sigla ?? i.estado.nome
                  : i.estado
                : undefined;
            return (
              <span key={idx} className="cnpj-pill">
                {uf ? `${uf}: ` : ""}
                {num ?? "—"}
              </span>
            );
          })}
        </div>
      ) : typeof incsRaw === "string" && incsRaw ? (
        incsRaw
      ) : (
        <span className="italic text-subtle">Não informado</span>
      ),
    ],
  ];

  return (
    <table className="cnpj-table w-full">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th className="w-1/3 align-top">{label}</th>
            <td>{value || <span className="italic text-subtle">— vazio</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function valueOrEmpty(v?: string): string {
  return v ?? "";
}
