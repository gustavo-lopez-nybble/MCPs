import axios from "axios";

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  throw new Error(
    "Missing Jira config: set JIRA_BASE_URL (e.g. https://<site>.atlassian.net/rest/api/3), JIRA_EMAIL, and JIRA_API_TOKEN"
  );
}

// e.g.: https://nybblegroup.atlassian.net/browse/LISO-3521
export const jiraClient = axios.create({
  baseURL: JIRA_BASE_URL,
  auth: {
    username: JIRA_EMAIL,
    password: JIRA_API_TOKEN,
  },
  headers: {
    Accept: "application/json",
  },
});