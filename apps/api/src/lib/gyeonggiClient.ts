export type TGyeonggiRawRow = Record<string, string | number | null | undefined>;

export interface IGyeonggiClient {
  fetchAllBySigungu: (sigungu: string) => Promise<TGyeonggiRawRow[]>;
}

export interface IGyeonggiClientConfig {
  apiKey: string;
  baseUrl: string;
  path: string;
}

const PAGE_SIZE = 1000;
const MAX_RETRIES = 1;

type TGyeonggiEnvelope = Record<string, unknown>;

/**
 * 경기도 openapi 응답 구조: { [datasetName]: [{ head: [...] }, { row: [...] }] }.
 * 데이터셋명이 서비스마다 달라 키를 훑어 row 배열을 찾는다.
 */
const extractRows = (json: TGyeonggiEnvelope): TGyeonggiRawRow[] => {
  for (const value of Object.values(json)) {
    if (!Array.isArray(value)) continue;
    for (const segment of value) {
      if (
        segment &&
        typeof segment === "object" &&
        "row" in segment &&
        Array.isArray((segment as { row: unknown }).row)
      ) {
        return (segment as { row: TGyeonggiRawRow[] }).row;
      }
    }
  }
  return [];
};

/** RESULT.CODE 가 INFO-000 이 아니면 에러 — 응답 어디에 있든 찾는다. */
const extractResultCode = (
  json: TGyeonggiEnvelope,
): { code: string; message: string } | null => {
  const visit = (node: unknown): { code: string; message: string } | null => {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = visit(item);
        if (found) return found;
      }
      return null;
    }
    const record = node as Record<string, unknown>;
    if (record.RESULT && typeof record.RESULT === "object") {
      const result = record.RESULT as Record<string, unknown>;
      if (typeof result.CODE === "string") {
        return {
          code: result.CODE,
          message: typeof result.MESSAGE === "string" ? result.MESSAGE : "",
        };
      }
    }
    for (const value of Object.values(record)) {
      const found = visit(value);
      if (found) return found;
    }
    return null;
  };
  return visit(json);
};

/** 네트워크 실패(타임아웃 포함)만 1회 재시도. 응답이 왔는데 에러 코드인 건 재시도 대상이 아니다. */
const fetchJsonWithRetry = async (url: string): Promise<TGyeonggiEnvelope> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const res = await fetch(url, {
        // gg.go.kr WAF가 기본 UA(curl 등)를 HTML로 차단한다.
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; real-estate-review-with-harness/0.1)",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as TGyeonggiEnvelope;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

export const createGyeonggiClient = (
  config: IGyeonggiClientConfig,
): IGyeonggiClient => ({
  fetchAllBySigungu: async (sigungu: string): Promise<TGyeonggiRawRow[]> => {
    const rows: TGyeonggiRawRow[] = [];
    let pageIndex = 1;

    for (;;) {
      const url = new URL(`${config.baseUrl.replace(/\/$/, "")}/${config.path}`);
      url.searchParams.set("KEY", config.apiKey);
      url.searchParams.set("Type", "json");
      url.searchParams.set("pIndex", String(pageIndex));
      url.searchParams.set("pSize", String(PAGE_SIZE));
      url.searchParams.set("SIGUN_NM", sigungu);

      const json = await fetchJsonWithRetry(url.toString());
      const result = extractResultCode(json);
      if (result && result.code !== "INFO-000") {
        throw new Error(`Gyeonggi OpenAPI ${result.code}: ${result.message}`);
      }

      const page = extractRows(json);
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
      pageIndex += 1;
    }

    return rows;
  },
});
