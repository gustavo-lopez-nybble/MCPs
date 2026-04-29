// ─── Config ───────────────────────────────────────────────────

export const ROOT_DIR = process.env.FS_ROOT_DIR ?? process.cwd();

// Configurable extensions from the consuming project.
// If unset, any non-blocked extension is allowed.
export const ALLOWED_EXTENSIONS: Set<string> | null = process.env.FS_ALLOWED_EXTENSIONS
  ? new Set(process.env.FS_ALLOWED_EXTENSIONS.split(",").map(e => e.trim().toLowerCase()))
  : null; // null = allow all (except blocked)

// These extensions are NEVER read, regardless of project configuration.
export const BLOCKED_EXTENSIONS = new Set([
  ".env", ".pem", ".key", ".p12", ".pfx",
  ".cer", ".crt", ".secret", ".password",
]);

export const IGNORED_DIRS = new Set([
  "node_modules", ".git", "dist",
  "target", ".angular", ".idea", "build",
]);

export const MAX_FILE_SIZE_KB = parseInt(process.env.FS_MAX_FILE_KB ?? "100");