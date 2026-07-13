import { onlyDigits } from "./formatters";

const CNPJ_API_BASE = "https://publica.cnpj.ws/cnpj/";

export class CnpjApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CnpjApiError";
    this.status = status;
  }
}

/**
 * Consulta a API pública https://publica.cnpj.ws/cnpj/{cnpj}.
 * Recebe o CNPJ como string (com ou sem máscara). Não envia headers customizados.
 */
export async function fetchCnpj(cnpjInput: string, signal?: AbortSignal): Promise<unknown> {
  const digits = onlyDigits(cnpjInput);
  if (digits.length !== 14) {
    throw new CnpjApiError("CNPJ deve conter 14 dígitos (XX.XXX.XXX/XXXX-XX).", 0);
  }
  const url = `${CNPJ_API_BASE}${digits}`;
  const init: RequestInit = {
    method: "GET",
    headers: { Accept: "application/json" },
  };
  if (signal) init.signal = signal;

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new CnpjApiError(
      "Não foi possível contatar a API pública. Verifique sua conexão e tente novamente.",
      0,
    );
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new CnpjApiError("CNPJ não encontrado na base pública.", 404);
    }
    if (res.status === 429) {
      throw new CnpjApiError("Limite de requisições excedido. Aguarde alguns segundos.", 429);
    }
    throw new CnpjApiError(`Erro ${res.status} ao consultar CNPJ.`, res.status);
  }

  try {
    return await res.json();
  } catch {
    throw new CnpjApiError("Resposta inválida da API pública (JSON malformado).", res.status);
  }
}
