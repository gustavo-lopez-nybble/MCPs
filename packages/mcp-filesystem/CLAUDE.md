# mcp-filesystem — Rules and context

## Responsibility
Read-only access to files in any project.
It is fully generic — it does not know any specific stack or project.
The project context (which folders matter, which stack is used) is defined by the consuming project's CLAUDE.md.

## Available tools
- `list_directory` → list files in a folder
- `read_file` → read a file
- `search_in_files` → search text recursively
- `get_project_structure` → folder tree

## Security restrictions (not configurable)
- Only reads inside FS_ROOT_DIR, never outside
- Cannot write or modify files
- Always ignores: node_modules, .git, dist, target, .angular, .idea, build
- Never reads: .env .pem .key .p12 .pfx .cer .crt .secret .password

## Environment variables
- FS_ROOT_DIR → absolute path to the project to read (required in production; if unset, the process `cwd` is used)
- FS_ALLOWED_EXTENSIONS → allowed extensions, comma-separated (optional)
  If unset, any non-blocked extension is allowed
  Example: .ts,.tsx,.json,.md
- FS_MAX_FILE_KB → maximum file size in KB (default: 100)

## Claude Desktop (Windows)
Copy the contents of `claude_config_by_project.example.json` into **%APPDATA%\\Claude\\claude_desktop_config.json** (full path: `C:\\Users\\<you>\\AppData\\Roaming\\Claude\\claude_desktop_config.json`). If that file already has other top-level keys, **merge** only the `mcpServers.filesystem` entry; do not replace the whole file.

- Set `FS_ROOT_DIR` to the **Windows** absolute path of the codebase to read (forward slashes in JSON are fine, e.g. `C:/path/to/your/project`).
- **Use the full path to `bun.exe` in `command`** (e.g. `C:/Users/<you>/.bun/bin/bun.exe`). Claude Desktop often does **not** inherit your shell `PATH`, so plain `"bun"` fails with “Local MCP servers” errors even when Bun works in a terminal.
- **Set `cwd` to this package’s folder** (`.../packages/mcp-filesystem`).
- **Use an absolute path in `args` for the entry file** (recommended for Claude Desktop on Windows): `"args": ["run", "C:/Users/<you>/.../packages/mcp-filesystem/src/index.ts"]`. Some Desktop builds do not apply `cwd` to the child process, which makes `bun run src/index.ts` fail with `Script not found "src/index.ts"` even when `cwd` is set in JSON. The absolute second argument avoids that. You can still use `["run", "src/index.ts"]` if your client honors `cwd` (e.g. local terminal).
- **Comparing config files:** the `mcpServers` block should match the example (same `command`, `args`, `cwd`, `env`). A different top-level section (e.g. `preferences`) in `claude_desktop_config.json` is normal and does not break MCP.
- **Fallback without Bun:** `bun run build` in this package, then run the bundle with a **Node 18+** binary using `node --import` / ESM as needed, or keep using `bun.exe` (recommended on Windows). The default `node` on `PATH` (e.g. old nvm) may be too old for the bundled `dist/index.js`.

## Local verification
- Run `bun run test:mcp` from this package. It spawns the server over stdio, lists tools, and checks `list_directory` and `read_file` against `FS_ROOT_DIR` (defaults to the monorepo root). Set `BUN_EXE` if `bun` is not on `PATH` for the test process.
- For interactive debugging, install and run [MCP Inspector](https://github.com/modelcontextprotocol/inspector) with `npx @modelcontextprotocol/inspector` (on Windows, avoid `npx -p … mcp-inspector`, which can fail to resolve the binary). In the UI, use the same `command` / `args` / `cwd` / `env` as in Claude Desktop.
