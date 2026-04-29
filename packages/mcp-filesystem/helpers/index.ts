
import { join, extname, resolve, relative, isAbsolute } from "path";
import { ALLOWED_EXTENSIONS, BLOCKED_EXTENSIONS, ROOT_DIR } from "../config";

export function safePath(userPath: string): string {
    const rootResolved = resolve(ROOT_DIR);
    const resolved     = resolve(rootResolved, userPath);
    const rel          = relative(rootResolved, resolved);
    // Reject traversals, different drives, and ambiguous `startsWith(root)` prefix issues on Windows.
    if (isAbsolute(rel) || rel.split(/[/\\]/).includes("..")) {
      throw new Error("Access denied: path outside the allowed directory");
    }
    return resolved;
  }

 export function isAllowedExtension(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
  
    // Always blocked, no exception
    if (BLOCKED_EXTENSIONS.has(ext)) return false;
  
    // If the project configured a list, honor it
    if (ALLOWED_EXTENSIONS) return ALLOWED_EXTENSIONS.has(ext);
  
    // No list configured → allow anything that is not blocked
    return true;
  }
  
 export function ok(text: string) {
    return { content: [{ type: "text" as const, text }] };
  }
  
 export function err(message: string, suggestion?: string) {
    return {
      content: [{
        type: "text" as const,
        text: [`❌ ${message}`, suggestion ? `💡 ${suggestion}` : ""]
          .filter(Boolean).join("\n"),
      }],
      isError: true as const,
    };
  }