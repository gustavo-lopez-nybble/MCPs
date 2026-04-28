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
- FS_ROOT_DIR → absolute path to the project to read (required)
- FS_ALLOWED_EXTENSIONS → allowed extensions, comma-separated (optional)
  If unset, any non-blocked extension is allowed
  Example: .ts,.tsx,.json,.md
- FS_MAX_FILE_KB → maximum file size in KB (default: 100)
