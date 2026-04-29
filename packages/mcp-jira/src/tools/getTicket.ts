import { jiraClient } from "../services/jiraClient";
import { mapTicket } from "../mappers/ticketMapper";


// e.g.: https://nybblegroup.atlassian.net/browse/LISO-3521
const ISSUE_FIELDS = ["summary", "description", "issuetype", "attachment"].join(
  ","
);

export async function getTicket(ticketId: string) {
  const issue = await jiraClient.get(`/issue/${ticketId}`, {
    params: { fields: ISSUE_FIELDS },
  });
  const comments = await jiraClient.get(`/issue/${ticketId}/comment`);

  return mapTicket(issue.data, comments.data);
}