import "dotenv/config";
import { getTicket } from "./tools/getTicket";
import { extractTicketId } from "../../../shared/utils";

// Optional: one-off test without the MCP process (e.g. npm run demo)
const input =
  process.argv[2] || "https://nybblegroup.atlassian.net/browse/LISO-3521";

async function main() {
  const ticketId = extractTicketId(input);
  const ticket = await getTicket(ticketId);
  console.log(JSON.stringify(ticket, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
