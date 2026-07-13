import type { ReactNode } from "react";
import { autoFormat, maskPhone } from "./formatters";

type Endereco = {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  uf?: string;
  municipio?: string;
};

type Cnae = { codigo?: string | number; descricao?: string };

type CnpjJson = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  situacao?: string;
  data_situacao?: string;
  endereco?: Endereco;
  municipio?: string;
  uf?: string;
  cep?: string;
  email?: string;
  telefones?: string[] | string;
  capital_social?: string | number;
  cnae_fiscal?: number | string;
  cnae_fiscal_descricao?: string;
  atividade_principal?: Cnae[];
  inscricoes_estaduais?: Array<{ numero?: string; estado?: string }> | string;
  [k: string]: unknown;
};

function formatTelefones(t: CnpjJson["telefones"]): string {
  if (!t) return "";
  if (Array.isArray(t)) return t.map(maskPhone).filter(Boolean).join(" · ");
  return maskPhone(String(t));
}

/** Resumo em formato de definição (label/valor), padrão web. */
export function CnpjSummary({ data }: { data: unknown }) {
  const d = (data ?? {}) as CnpjJson;
  const endereco = (d.endereco ?? {}) as Endereco;
  const logradouro = [
    endereco.logradouro,
    endereco.numero ? `, ${endereco.numero}` : "",
    endereco.complemento ? ` — ${endereco.complemento}` : "",
  ]
    .join("")
    .trim();
  const bairro = endereco.bairro;
  const cidade = d.municipio || endereco.municipio;
  const uf = d.uf || endereco.uf;
  const cep = d.cep || endereco.cep;
  const cnaeDesc = d.cnae_fiscal_descricao ?? "";
  const cnaeCodigo = d.cnae_fiscal ?? "";
  const cnaeAtividade = d.atividade_principal?.[0];
  const incs = d.inscricoes_estaduais;

  const rows: Array<[string, ReactNode]> = [
    ["Razão social", <strong key="rs" className="text-text">{d.razao_social || "—"}</strong>],
    ["Nome fantasia", valueOrEmpty(d.nome_fantasia)],
    ["Situação cadastral", valueOrEmpty(d.situacao)],
    ["Data da situação", valueOrEmpty(d.data_situacao ? autoFormat("data_situacao", d.data_situacao) : "")],
    [
      "Capital social",
      d.capital_social !== undefined && d.capital_social !== ""
        ? autoFormat("capital_social", d.capital_social)
        : "",
    ],
    [
      "Endereço",
      logradouro || bairro || cidade || uf || cep ? (
        <div className="flex flex-col gap-0.5">
          <span>{logradouro || "—"}</span>
          <span className="text-muted text-xs">
            {[bairro, cidade, uf].filter(Boolean).join(" · ")}
          </span>
          {cep && (
            <span className="text-muted text-xs">CEP {autoFormat("cep", cep)}</span>
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
    ["Telefone(s)", valueOrEmpty(formatTelefones(d.telefones))],
    ["E-mail", valueOrEmpty(d.email)],
    [
      "Inscrições estaduais",
      Array.isArray(incs) && incs.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {incs.map((i, idx) =>
            typeof i === "object" && i !== null ? (
              <span key={idx} className="cnpj-pill">
                {i.estado ? `${i.estado}: ` : ""}
                {i.numero ?? "—"}
              </span>
            ) : (
              <span key={idx} className="cnpj-pill">
                {String(i)}
              </span>
            ),
          )}
        </div>
      ) : typeof incs === "string" && incs ? (
        incs
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
