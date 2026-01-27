/**
 * Formats tool invocations for user-friendly display in the chat interface
 */

/**
 * Get a user-friendly display name for a tool invocation
 * Supports AI SDK v6 tool parts (type: tool-${name}, input)
 */
export function getToolDisplayName(tool: { type: string; input?: unknown }): string {
  // AI SDK v6: type is `tool-${toolName}`, input instead of args
  const toolName = tool.type.replace(/^tool-/, '');
  const args = tool.input as Record<string, any> | undefined;

  switch (toolName) {
    case "str_replace_editor": {
      // Try to extract the operation and filename from args
      const command = args?.command;
      const path = args?.path;
      const filename = path ? path.split("/").pop() : null;

      if (command === "create" && filename) {
        return `Creating ${filename}`;
      } else if (command === "str_replace" && filename) {
        return `Editing ${filename}`;
      } else if (command === "insert" && filename) {
        return `Updating ${filename}`;
      } else if (command === "view" && filename) {
        return `Viewing ${filename}`;
      } else if (filename) {
        return `Working on ${filename}`;
      }

      // Fallback if no args available
      return "Updating code";
    }

    case "file_manager": {
      const command = args?.command;
      const path = args?.path;
      const filename = path ? path.split("/").pop() : null;

      if (command === "delete" && filename) {
        return `Deleting ${filename}`;
      } else if (command === "rename" && filename) {
        return `Renaming ${filename}`;
      }

      return "Managing files";
    }

    default:
      // For any unknown tools, convert snake_case to Title Case
      return toolName
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
  }
}
