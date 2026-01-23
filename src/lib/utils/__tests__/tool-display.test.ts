import { test, expect } from "vitest";
import { getToolDisplayName } from "../tool-display";

test("getToolDisplayName formats str_replace_editor with create command", () => {
  const tool = {
    toolName: "str_replace_editor",
    args: {
      command: "create",
      path: "src/components/Button.jsx",
    },
  };

  expect(getToolDisplayName(tool)).toBe("Creating Button.jsx");
});

test("getToolDisplayName formats str_replace_editor with str_replace command", () => {
  const tool = {
    toolName: "str_replace_editor",
    args: {
      command: "str_replace",
      path: "src/App.jsx",
    },
  };

  expect(getToolDisplayName(tool)).toBe("Editing App.jsx");
});

test("getToolDisplayName formats str_replace_editor with insert command", () => {
  const tool = {
    toolName: "str_replace_editor",
    args: {
      command: "insert",
      path: "src/utils/helper.js",
    },
  };

  expect(getToolDisplayName(tool)).toBe("Updating helper.js");
});

test("getToolDisplayName formats str_replace_editor with view command", () => {
  const tool = {
    toolName: "str_replace_editor",
    args: {
      command: "view",
      path: "src/config.ts",
    },
  };

  expect(getToolDisplayName(tool)).toBe("Viewing config.ts");
});

test("getToolDisplayName falls back for str_replace_editor without args", () => {
  const tool = {
    toolName: "str_replace_editor",
    args: {},
  };

  expect(getToolDisplayName(tool)).toBe("Updating code");
});

test("getToolDisplayName formats file_manager with delete command", () => {
  const tool = {
    toolName: "file_manager",
    args: {
      command: "delete",
      path: "src/old/Legacy.jsx",
    },
  };

  expect(getToolDisplayName(tool)).toBe("Deleting Legacy.jsx");
});

test("getToolDisplayName formats file_manager with rename command", () => {
  const tool = {
    toolName: "file_manager",
    args: {
      command: "rename",
      path: "src/OldName.jsx",
      new_path: "src/NewName.jsx",
    },
  };

  expect(getToolDisplayName(tool)).toBe("Renaming OldName.jsx");
});

test("getToolDisplayName falls back for file_manager without args", () => {
  const tool = {
    toolName: "file_manager",
    args: {},
  };

  expect(getToolDisplayName(tool)).toBe("Managing files");
});

test("getToolDisplayName converts unknown tool names to Title Case", () => {
  const tool = {
    toolName: "some_custom_tool",
    args: {},
  };

  expect(getToolDisplayName(tool)).toBe("Some Custom Tool");
});

test("getToolDisplayName handles tool without args property", () => {
  const tool = {
    toolName: "str_replace_editor",
  };

  expect(getToolDisplayName(tool)).toBe("Updating code");
});
