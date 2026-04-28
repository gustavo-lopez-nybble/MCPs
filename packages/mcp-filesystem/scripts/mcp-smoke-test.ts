import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname  = dirname(fileURLToPath(import.meta.url));
const packageDir = join(__dirname, "..");
const monorepoRoot = join(packageDir, "..", "..");
const fsRoot         = process.env.FS_ROOT_DIR ?? monorepoRoot;
const bunExe         = process.env.BUN_EXE ?? "bun";

const transport = new StdioClientTransport({
  command: bunExe,
  args:    ["run", "src/index.ts"],
  cwd:     packageDir,
  env:     { ...process.env, FS_ROOT_DIR: fsRoot },
  stderr:  "inherit",
});

const client = new Client({ name: "mcp-filesystem-smoke", version: "1.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
const names     = tools.map(t => t.name).sort();
const expected  = ["get_project_structure", "list_directory", "read_file", "search_in_files"];
for (const n of expected) {
  if (!names.includes(n)) throw new Error(`Missing tool ${n}. Got: ${names.join(", ")}`);
}

const list = await client.callTool({ name: "list_directory", arguments: { path: "packages/mcp-filesystem" } });
if (list.isError) throw new Error(String(JSON.stringify(list)));

const read = await client.callTool({
  name:      "read_file",
  arguments: { path: "packages/mcp-filesystem/package.json" },
});
if (read.isError) throw new Error(String(JSON.stringify(read)));
const content = "content" in read ? read.content : undefined;
const first   = Array.isArray(content) ? content[0] : undefined;
if (!first || first.type !== "text" || !("text" in first) || !first.text.includes(`"name":`)) {
  throw new Error("read_file did not return package.json text");
}

console.log("mcp-smoke-test: OK (listTools, list_directory, read_file)");
await transport.close();
process.exit(0);
