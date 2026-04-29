import { z } from "zod";
import { get_project_structure, list_directory, read_file, search_in_files } from "../tools";

export const fs_list_directory = {
    name: "list_directory",
    description: {
      description: "Lists files and folders in a project directory",
      inputSchema: {
        path: z.string().default(".").describe("Path relative to root. E.g. 'src/services'"),
      },
    },
    handler: async ({ path }: { path: string }) => await list_directory({ path })
  };


export const fs_read_file = {
    name: "read_file",
    description: {
        description: "Reads a file from the project",
        inputSchema: {
            path: z.string().describe("Path relative to the file. E.g. 'src/UserService.java'"),
        },
    },
    handler: async ({ path }: { path: string }) => await read_file({ path })
};

export const fs_search_in_files = {
    name: "search_in_files",
    description: {
        description: "Searches for text inside project files",
        inputSchema: {
            query: z.string().describe("Text to search for"),
            path: z.string().default(".").describe("Directory to search in"),
            extension: z.string().optional().describe("Filter by extension. E.g. '.java'"),
        },
    },
    handler: async ({ query, path, extension }: { query: string; path: string; extension?: string }) =>
      await search_in_files({ query, path, extension })
};

export const fs_get_project_structure = {
    name: "get_project_structure",
    description: {
        description: "Shows the project's folder tree",
        inputSchema: {
            depth: z.number().min(1).max(4).default(3).describe("Maximum depth"),
        },
    },
    handler: async ({ depth }: { depth: number }) => await get_project_structure({ depth })
};