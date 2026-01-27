import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PreviewFrame } from "../PreviewFrame";

// Mock the file system context
const mockGetAllFiles = vi.fn();
vi.mock("@/lib/contexts/file-system-context", () => ({
  useFileSystem: () => ({
    getAllFiles: mockGetAllFiles,
    refreshTrigger: 0,
  }),
}));

// Mock the JSX transformer
vi.mock("@/lib/transform/jsx-transformer", () => ({
  createImportMap: vi.fn(() => ({
    importMap: {},
    styles: "",
    errors: [],
  })),
  createPreviewHTML: vi.fn(() => "<html><body>Preview</body></html>"),
}));

import { createImportMap, createPreviewHTML } from "@/lib/transform/jsx-transformer";

describe("PreviewFrame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("First load state", () => {
    test("should show first load message when no files exist", () => {
      mockGetAllFiles.mockReturnValue(new Map());

      render(<PreviewFrame />);

      expect(screen.getByText("Live Preview")).toBeTruthy();
      expect(screen.getByText(/Your component will appear here once generated/)).toBeTruthy();
      expect(screen.getByText("Real-time rendering")).toBeTruthy();
    });
  });

  describe("Error state", () => {
    test("should show error message when no React component is found", () => {
      // Has files but no valid entry point
      mockGetAllFiles.mockReturnValue(
        new Map([
          ["/styles.css", ".container {}"],
        ])
      );

      render(<PreviewFrame />);

      expect(screen.getByText("No Preview Available")).toBeTruthy();
      expect(screen.getByText(/No React component found/)).toBeTruthy();
    });

    test("should show instructions to create React component", () => {
      mockGetAllFiles.mockReturnValue(
        new Map([
          ["/readme.txt", "just a readme"],
        ])
      );

      render(<PreviewFrame />);

      expect(screen.getByText(/Create a React component using the AI assistant/)).toBeTruthy();
    });
  });

  describe("Preview rendering", () => {
    test("should render iframe when valid entry point exists", () => {
      mockGetAllFiles.mockReturnValue(
        new Map([
          ["/App.jsx", "export default function App() { return <div>Hello</div>; }"],
        ])
      );

      render(<PreviewFrame />);

      const iframe = document.querySelector("iframe");
      expect(iframe).toBeTruthy();
      expect(iframe?.getAttribute("title")).toBe("Preview");
    });

    test("should call createImportMap with files", () => {
      const files = new Map([
        ["/App.jsx", "export default function App() { return <div>Hello</div>; }"],
        ["/components/Button.jsx", "export const Button = () => <button />;"],
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      expect(createImportMap).toHaveBeenCalledWith(files);
    });

    test("should call createPreviewHTML with entry point", () => {
      const files = new Map([
        ["/App.jsx", "export default function App() { return <div>Hello</div>; }"],
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      expect(createPreviewHTML).toHaveBeenCalledWith(
        "/App.jsx",
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    test("should set iframe sandbox attribute", () => {
      mockGetAllFiles.mockReturnValue(
        new Map([
          ["/App.jsx", "export default function App() { return <div>Hello</div>; }"],
        ])
      );

      render(<PreviewFrame />);

      const iframe = document.querySelector("iframe");
      const sandbox = iframe?.getAttribute("sandbox");
      expect(sandbox).toContain("allow-scripts");
      expect(sandbox).toContain("allow-same-origin");
    });
  });

  describe("Entry point detection", () => {
    test("should use App.jsx as default entry point", () => {
      mockGetAllFiles.mockReturnValue(
        new Map([
          ["/App.jsx", "export default function App() {}"],
          ["/index.jsx", "export default function Index() {}"],
        ])
      );

      render(<PreviewFrame />);

      expect(createPreviewHTML).toHaveBeenCalledWith(
        "/App.jsx",
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    test("should fall back to App.tsx if App.jsx not found", () => {
      mockGetAllFiles.mockReturnValue(
        new Map([
          ["/App.tsx", "export default function App() {}"],
        ])
      );

      render(<PreviewFrame />);

      expect(createPreviewHTML).toHaveBeenCalledWith(
        "/App.tsx",
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    test("should fall back to index.jsx if no App file", () => {
      mockGetAllFiles.mockReturnValue(
        new Map([
          ["/index.jsx", "export default function Index() {}"],
        ])
      );

      render(<PreviewFrame />);

      expect(createPreviewHTML).toHaveBeenCalledWith(
        "/index.jsx",
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    test("should use src/App.jsx if available", () => {
      mockGetAllFiles.mockReturnValue(
        new Map([
          ["/src/App.jsx", "export default function App() {}"],
        ])
      );

      render(<PreviewFrame />);

      expect(createPreviewHTML).toHaveBeenCalledWith(
        "/src/App.jsx",
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    test("should use first JSX file if no standard entry point found", () => {
      mockGetAllFiles.mockReturnValue(
        new Map([
          ["/components/Counter.jsx", "export function Counter() {}"],
        ])
      );

      render(<PreviewFrame />);

      expect(createPreviewHTML).toHaveBeenCalledWith(
        "/components/Counter.jsx",
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe("Iframe styling", () => {
    test("should have correct CSS classes", () => {
      mockGetAllFiles.mockReturnValue(
        new Map([
          ["/App.jsx", "export default function App() {}"],
        ])
      );

      render(<PreviewFrame />);

      const iframe = document.querySelector("iframe");
      expect(iframe?.classList.contains("w-full")).toBe(true);
      expect(iframe?.classList.contains("h-full")).toBe(true);
      expect(iframe?.classList.contains("border-0")).toBe(true);
      expect(iframe?.classList.contains("bg-white")).toBe(true);
    });
  });
});
