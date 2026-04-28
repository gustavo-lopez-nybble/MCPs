import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readdir, readFile, stat } from "fs/promises";
import { join, extname, resolve, relative } from "path";

// ─── Config ───────────────────────────────────────────────────

const ROOT_DIR = process.env.FS_ROOT_DIR ?? process.cwd();

// Configurable extensions from the consuming project.
// If unset, any non-blocked extension is allowed.
const ALLOWED_EXTENSIONS: Set<string> | null = process.env.FS_ALLOWED_EXTENSIONS
  ? new Set(process.env.FS_ALLOWED_EXTENSIONS.split(",").map(e => e.trim().toLowerCase()))
  : null; // null = allow all (except blocked)

// These extensions are NEVER read, regardless of project configuration.
const BLOCKED_EXTENSIONS = new Set([
  ".env", ".pem", ".key", ".p12", ".pfx",
  ".cer", ".crt", ".secret", ".password",
]);

const IGNORED_DIRS = new Set([
  "node_modules", ".git", "dist",
  "target", ".angular", ".idea", "build",
]);

const MAX_FILE_SIZE_KB = parseInt(process.env.FS_MAX_FILE_KB ?? "100");

// ─── Helpers ──────────────────────────────────────────────────

function safePath(userPath: string): string {
  const resolved = resolve(join(ROOT_DIR, userPath));
  if (!resolved.startsWith(ROOT_DIR)) {
    throw new Error("Access denied: path outside the allowed directory");
  }
  return resolved;
}

function isAllowedExtension(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();

  // Always blocked, no exception
  if (BLOCKED_EXTENSIONS.has(ext)) return false;

  // If the project configured a list, honor it
  if (ALLOWED_EXTENSIONS) return ALLOWED_EXTENSIONS.has(ext);

  // No list configured → allow anything that is not blocked
  return true;
}

function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function err(message: string, suggestion?: string) {
  return {
    content: [{
      type: "text" as const,
      text: [`❌ ${message}`, suggestion ? `💡 ${suggestion}` : ""]
        .filter(Boolean).join("\n"),
    }],
    isError: true as const,
  };
}

// ─── Server ───────────────────────────────────────────────────

const server = new McpServer({
  name: "mcp-filesystem",
  version: "1.0.0",
});

// ─── Tool: list_directory ─────────────────────────────────────

server.registerTool(
  "list_directory",
  {
    description: "Lists files and folders in a project directory",
    inputSchema: {
      path: z.string().default(".").describe("Path relative to root. E.g. 'src/services'"),
    },
  },
  async ({ path }) => {
    try {
      const fullPath = safePath(path);
      const entries = await readdir(fullPath, { withFileTypes: true });

      const dirs  = entries.filter(e => e.isDirectory()).map(e => `📁 ${e.name}/`);
      const files = entries.filter(e => e.isFile()).map(e => `📄 ${e.name}`);
      const all   = [...dirs, ...files];

      if (!all.length) return ok("Empty directory");

      return ok(`## Contents of \`${path}\`\n\n${all.join("\n")}`);
    } catch (e: any) {
      return err(`Could not list "${path}"`, e.message);
    }
  }
);

// ─── Tool: read_file ──────────────────────────────────────────

server.registerTool(
  "read_file",
  {
    description: "Reads a file from the project",
    inputSchema: {
      path: z.string().describe("Path relative to the file. E.g. 'src/UserService.java'"),
    },
  },
  async ({ path }) => {
    try {
      if (!isAllowedExtension(path)) {
        const ext = extname(path).toLowerCase();
        const suggestion = BLOCKED_EXTENSIONS.has(ext)
          ? `Blocked: ${[...BLOCKED_EXTENSIONS].join(", ")}`
          : ALLOWED_EXTENSIONS
            ? `Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`
            : undefined;
        return err(
          `Extension not allowed: ${extname(path)}`,
          suggestion
        );
      }

      const fullPath = safePath(path);
      const info     = await stat(fullPath);

      if (info.size > MAX_FILE_SIZE_KB * 1024) {
        return err(
          `File too large (${Math.round(info.size / 1024)}KB)`,
          `Maximum: ${MAX_FILE_SIZE_KB}KB. Use search_in_files to search by section.`
        );
      }

      const content = await readFile(fullPath, "utf-8");
      const ext     = extname(path).replace(".", "");

      return ok(`## \`${path}\`\n\n\`\`\`${ext}\n${content}\n\`\`\``);
    } catch (e: any) {
      return err(`Could not read "${path}"`, e.message);
    }
  }
);

// ─── Tool: search_in_files ────────────────────────────────────

server.registerTool(
  "search_in_files",
  {
    description: "Searches for text inside project files",
    inputSchema: {
      query:     z.string().describe("Text to search for"),
      path:      z.string().default(".").describe("Directory to search in"),
      extension: z.string().optional().describe("Filter by extension. E.g. '.java'"),
    },
  },
  async ({ query, path, extension }) => {
    try {
      const fullPath = safePath(path);
      const results: string[] = [];

      async function searchDir(dirPath: string) {
        const entries = await readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const entryPath = join(dirPath, entry.name);

          if (entry.isDirectory()) {
            if (!IGNORED_DIRS.has(entry.name)) await searchDir(entryPath);
            continue;
          }

          if (extension && extname(entry.name) !== extension) continue;
          if (!isAllowedExtension(entry.name)) continue;

          try {
            const info = await stat(entryPath);
            if (info.size > MAX_FILE_SIZE_KB * 1024) continue;

            const content = await readFile(entryPath, "utf-8");

            content.split("\n").forEach((line, i) => {
              if (line.toLowerCase().includes(query.toLowerCase())) {
                const rel = relative(ROOT_DIR, entryPath);
                results.push(`**${rel}:${i + 1}**\n\`\`\`\n${line.trim()}\n\`\`\``);
              }
            });
          } catch { /* unreadable file, skip */ }
        }
      }

      await searchDir(fullPath);

      if (!results.length) return ok(`No matches for "${query}" in ${path}`);

      const shown  = results.slice(0, 20);
      const header = `## Results for "${query}" (${results.length} found)\n\n`;
      return ok(header + shown.join("\n\n"));
    } catch (e: any) {
      return err(`Error searching "${query}"`, e.message);
    }
  }
);

// ─── Tool: get_project_structure ─────────────────────────────

server.registerTool(
  "get_project_structure",
  {
    description: "Shows the project's folder tree",
    inputSchema: {
      depth: z.number().min(1).max(4).default(3).describe("Maximum depth"),
    },
  },
  async ({ depth }) => {
    try {
      const lines: string[] = [`## Project structure (root: ${ROOT_DIR})\n`];

      async function walk(dirPath: string, level: number, prefix: string) {
        if (level > depth) return;
        const entries = await readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          if (IGNORED_DIRS.has(entry.name)) continue;
          const isDir = entry.isDirectory();
          lines.push(`${prefix}${isDir ? "📁" : "📄"} ${entry.name}`);
          if (isDir) await walk(join(dirPath, entry.name), level + 1, prefix + "  ");
        }
      }

      await walk(ROOT_DIR, 1, "");
      return ok(lines.join("\n"));
    } catch (e: any) {
      return err("Could not get project structure", e.message);
    }
  }
);

// ─── Start ────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`✅ mcp-filesystem ready (root: ${ROOT_DIR})`);
