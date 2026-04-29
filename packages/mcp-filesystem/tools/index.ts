import { readdir, readFile, stat } from "fs/promises";
import { err, isAllowedExtension, ok, safePath } from "../helpers";
import { ALLOWED_EXTENSIONS, BLOCKED_EXTENSIONS, IGNORED_DIRS, MAX_FILE_SIZE_KB, ROOT_DIR } from "../config";
import { extname, join, relative } from "path";

export async function list_directory({ path }: { path: string }) {
    try {
        const fullPath = safePath(path);
        const entries = await readdir(fullPath, { withFileTypes: true });

        const dirs  = entries.filter(e => e.isDirectory()).map(e => `📁 ${e.name}/`);
        const files = entries.filter(e => e.isFile()).map(e => `📄 ${e.name}`);
        const all   = [...dirs, ...files];

        if (!all.length) return ok("Empty directory");

        return ok(`## Contents of \`${path}\`\n\n${all.join("\n")}`);
    } catch (e: any) {
        throw new Error(`Could not list "${path}": ${e.message}`);
    }
}
  

export async function read_file({ path }: { path: string }) {
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

export async function search_in_files({
  query,
  path,
  extension,
}: {
  query: string;
  path: string;
  extension?: string;
}) {
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

export async function get_project_structure({ depth }: { depth: number }) {
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