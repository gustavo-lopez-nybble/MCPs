import "dotenv/config";
import { z } from "zod";
import { getTicket } from "./tools/getTicket";
import { extractTicketId } from "../../../shared/utils";

// SDK ships CJS; avoid TS ESM/CJS interop errors (see @modelcontextprotocol/sdk exports).
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

const server = new McpServer(
  { name: "mcp-jira", version: "1.0.0" },
  {
    instructions:
      "Jira Cloud: use get_jira_ticket with an issue key (LISO-3521) or a browse URL. Requires JIRA_BASE_URL (…/rest/api/3), JIRA_EMAIL, and JIRA_API_TOKEN in the environment.",
  }
);

server.registerTool(
  "get_jira_ticket",
  {
    title: "Get Jira issue",
    description:
      "Returns title, description (plain text from ADF), issue type, attachments, image URLs, comments (with author, dates, text, inline media URLs), and description media URLs.",
    inputSchema: z.object({
      ticket: z
        .string()
        .min(1)
        .describe("Issue key (e.g. LISO-3521) or Jira browse URL (e.g. https://x.atlassian.net/browse/LISO-3521)"),
    }),
  },
  async (args: { ticket: string }) => {
    const raw = args.ticket.trim();
    const ticketId = extractTicketId(raw);
    const data = await getTicket(ticketId);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
