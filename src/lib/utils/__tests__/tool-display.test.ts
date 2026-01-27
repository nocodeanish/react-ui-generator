import { test, expect } from "vitest";
import { getToolDisplayName } from "../tool-display";

test("getToolDisplayName formats str_replace_editor with create command", () => {
  const tool = {
    type: "tool-str_replace_editor",
    input: {
      command: "create",
      path: "src/components/Button.jsx",
    },
  };

  expect(getToolDisplayName(tool)).toBe("Creating Button.jsx");
});

test("getToolDisplayName formats str_replace_editor with str_replace command", () => {
  const tool = {
    type: "tool-str_replace_editor",
    input: {
      command: "str_replace",
      path: "src/App.jsx",
    },
  };

  expect(getToolDisplayName(tool)).toBe("Editing App.jsx");
});

test("getToolDisplayName formats str_replace_editor with insert command", () => {
  const tool = {
    type: "tool-str_replace_editor",
    input: {
      command: "insert",
      path: "src/utils/helper.js",
    },
  };

  expect(getToolDisplayName(tool)).toBe("Updating helper.js");
});

test("getToolDisplayName formats str_replace_editor with view command", () => {
  const tool = {
    type: "tool-str_replace_editor",
    input: {
      command: "view",
      path: "src/config.ts",
    },
  };

  expect(getToolDisplayName(tool)).toBe("Viewing config.ts");
});

test("getToolDisplayName falls back for str_replace_editor without input", () => {
  const tool = {
    type: "tool-str_replace_editor",
    input: {},
  };

  expect(getToolDisplayName(tool)).toBe("Updating code");
});

test("getToolDisplayName formats file_manager with delete command", () => {
  const tool = {
    type: "tool-file_manager",
    input: {
      command: "delete",
      path: "src/old/Legacy.jsx",
    },
  };

  expect(getToolDisplayName(tool)).toBe("Deleting Legacy.jsx");
});

test("getToolDisplayName formats file_manager with rename command", () => {
  const tool = {
    type: "tool-file_manager",
    input: {
      command: "rename",
      path: "src/OldName.jsx",
      new_path: "src/NewName.jsx",
    },
  };

  expect(getToolDisplayName(tool)).toBe("Renaming OldName.jsx");
});

test("getToolDisplayName falls back for file_manager without input", () => {
  const tool = {
    type: "tool-file_manager",
    input: {},
  };

  expect(getToolDisplayName(tool)).toBe("Managing files");
});

test("getToolDisplayName converts unknown tool names to Title Case", () => {
  const tool = {
    type: "tool-some_custom_tool",
    input: {},
  };

  expect(getToolDisplayName(tool)).toBe("Some Custom Tool");
});

test("getToolDisplayName handles tool without input property", () => {
  const tool = {
    type: "tool-str_replace_editor",
  };

  expect(getToolDisplayName(tool)).toBe("Updating code");
});
