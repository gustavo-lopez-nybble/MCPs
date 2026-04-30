import axios from "axios";

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  throw new Error(
    "Missing Jira config: set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN"
  );
}

/**
 * Mismo Jira, dos entradas:
 * - Navegador: …/browse/PROJ-123
 * - API JSON: …/rest/api/3/…
 * Aceptá sitio, link browse o base del API; se normaliza a …/rest/api/3.
 */
function normalizeJiraApiBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (/\/rest\/api\/(2|3)(\/|$)/.test(trimmed)) {
    return trimmed;
  }
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    throw new Error(
      `JIRA_BASE_URL no es una URL válida. Ej: https://tu-sitio.atlassian.net o el link …/browse/KEY`
    );
  }
  return `${u.origin}/rest/api/3`;
}

export const jiraClient = axios.create({
  baseURL: normalizeJiraApiBaseUrl(JIRA_BASE_URL),
  auth: {
    username: JIRA_EMAIL,
    password: JIRA_API_TOKEN,
  },
  headers: {
    Accept: "application/json",
  },
});
