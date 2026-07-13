// Helpers puros para formatação de campos retornados pela API pública de CNPJ.
// Sem dependências externas — usamos Intl + expressões regulares.

export function onlyDigits(value: string): string {
  return value.replace(/\D+/g, "");
}

export function maskCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

export function maskCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

/**
 * Tenta detectar e formatar uma data ISO (YYYY-MM-DD ou ISO completa)
 * para o formato brasileiro DD/MM/YYYY. Se não conseguir, devolve o valor original.
 */
export function formatDate(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "");
  const s = value.trim();
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

/**
 * Capital social pode vir como número, string numérica ("1234.56") ou string formatada.
 * Devolve sempre "R$ 1.234,56" para valores válidos; caso contrário, valor original.
 */
export function formatCurrency(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (Number.isFinite(num)) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  }
  return String(value);
}

/**
 * Formata booleanos em "Sim"/"Não". A API pode devolver 0/1, "S"/"N" ou true/false.
 */
export function formatBoolean(value: unknown): string {
  if (value === true || value === 1 || value === "1" || value === "S" || value === "s") {
    return "Sim";
  }
  if (value === false || value === 0 || value === "0" || value === "N" || value === "n") {
    return "Não";
  }
  return "";
}

/**
 * Decide o melhor formato de apresentação para um valor escalar vindo da API.
 * Usado na renderização dinâmica e no resumo.
 */
export function autoFormat(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const k = key.toLowerCase();
  if (k.includes("cnpj")) return maskCnpj(String(value));
  if (k.includes("cep")) return maskCep(String(value));
  if (k.includes("telefone") || k.includes("tel") || k.includes("fax")) {
    return maskPhone(String(value));
  }
  if (k.includes("data_") || k.startsWith("data") || k.endsWith("_data")) {
    return formatDate(value);
  }
  if (
    k.includes("capital") ||
    k.includes("valor") ||
    k.endsWith("_social") ||
    k.includes("faturamento")
  ) {
    return formatCurrency(value);
  }
  if (typeof value === "boolean" || value === 0 || value === 1) {
    const b = formatBoolean(value);
    if (b) return b;
  }
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return JSON.stringify(value);
}

/**
 * Conta quantos campos escalares preenchidos (não-vazios) existem em um JSON,
 * caminhando em objetos e listas. Útil para o contador "X campos preenchidos".
 */
export function countFilled(value: unknown): number {
  let count = 0;
  function walk(v: unknown): void {
    if (v === null || v === undefined) return;
    if (typeof v === "string") {
      if (v.trim() !== "") count++;
      return;
    }
    if (typeof v === "number" || typeof v === "boolean") {
      count++;
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) walk(item);
      return;
    }
    if (typeof v === "object") {
      for (const [, child] of Object.entries(v as Record<string, unknown>)) walk(child);
    }
  }
  walk(value);
  return count;
}

/**
 * Converte chaves tipo "razao_social" ou "nomeFantasia" em rótulos amigáveis.
 * Evita biblioteca externa.
 */
export function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}
