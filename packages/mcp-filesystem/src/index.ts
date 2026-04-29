import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ROOT_DIR } from "../config";
import { fs_get_project_structure, fs_list_directory, fs_read_file, fs_search_in_files } from "./tools";

// ─── Server ───────────────────────────────────────────────────

const server = new McpServer({
  name: "mcp-filesystem",
  version: "1.0.0",
});

// ─── Tools: register ────────────────────────────────────

server.registerTool(
  fs_list_directory.name,
  fs_list_directory.description,
  fs_list_directory.handler
);

server.registerTool(
  fs_read_file.name,
  fs_read_file.description,
  fs_read_file.handler
);


server.registerTool(
  fs_search_in_files.name,
  fs_search_in_files.description,
  fs_search_in_files.handler
);

server.registerTool(
  fs_get_project_structure.name,
  fs_get_project_structure.description,
  fs_get_project_structure.handler
);

// ─── Start ────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`✅ mcp-filesystem ready (root: ${ROOT_DIR})`);