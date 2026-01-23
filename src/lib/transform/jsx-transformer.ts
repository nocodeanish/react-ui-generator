import * as Babel from "@babel/standalone";

export interface TransformResult {
  code: string;
  error?: string;
  missingImports?: Set<string>; // Packages/modules imported but not in files
  cssImports?: Set<string>; // CSS files imported
}

// Helper to create a placeholder/stub module for missing imports
// This allows code to run even if a dependency is missing, preventing complete failure
function createPlaceholderModule(componentName: string): string {
  return `
import React from 'react';
const ${componentName} = function() {
  return React.createElement('div', {}, null);
}
export default ${componentName};
export { ${componentName} };
`;
}

// Transform a single JSX/TSX file to JavaScript using Babel
// Extracts imports for later resolution. Detects and removes CSS imports (not valid in browser ESM).
// Returns transformed code or error message
export function transformJSX(
  code: string,
  filename: string,
  existingFiles: Set<string>
): TransformResult {
  try {
    const isTypeScript = filename.endsWith(".ts") || filename.endsWith(".tsx");

    // Pre-process to handle imports (we'll track them for later resolution)
    let processedCode = code;
    // Match: import { x } from "path" or import x from "path"
    const importRegex =
      /import\s+(?:{[^}]+}|[^,\s]+)?\s*(?:,\s*{[^}]+})?\s+from\s+['"]([^'"]+)['"]/g;
    const imports = new Set<string>();
    const cssImports = new Set<string>();

    // Detect CSS imports (import "styles.css")
    const cssImportRegex = /import\s+['"]([^'"]+\.css)['"]/g;
    let cssMatch;
    while ((cssMatch = cssImportRegex.exec(code)) !== null) {
      cssImports.add(cssMatch[1]);
    }

    // Remove CSS imports from code before Babel transform (CSS not valid in ESM)
    processedCode = processedCode.replace(cssImportRegex, '');

    // Extract all module imports for later resolution
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      // Skip CSS files from regular imports (already handled)
      if (!match[1].endsWith('.css')) {
        imports.add(match[1]);
      }
    }

    // Transform JSX to JavaScript with React 19's automatic JSX runtime
    const result = Babel.transform(processedCode, {
      filename,
      presets: [
        ["react", { runtime: "automatic" }], // auto imports React functions
        ...(isTypeScript ? ["typescript"] : []), // support TS syntax
      ],
      plugins: [],
    });

    return {
      code: result.code || "",
      missingImports: imports, // Caller will resolve these
      cssImports: cssImports, // Caller will handle these
    };
  } catch (error) {
    return {
      code: "",
      error: error instanceof Error ? error.message : "Unknown transform error",
    };
  }
}

export function createBlobURL(
  code: string,
  mimeType: string = "application/javascript"
): string {
  const blob = new Blob([code], { type: mimeType });
  return URL.createObjectURL(blob);
}

export interface ImportMapResult {
  importMap: string;
  styles: string;
  errors: Array<{ path: string; error: string }>;
}

// Generate an import map for browser ESM resolution
// Maps import paths (like "@/components/Button") to blob URLs or CDN URLs
// Handles three types of imports: local files (blob URLs), third-party packages (esm.sh CDN), and stubs
export function createImportMap(files: Map<string, string>): ImportMapResult {
  // Start with core libraries from CDN (React, React-DOM, JSX runtime)
  const imports: Record<string, string> = {
    react: "https://esm.sh/react@19",
    "react-dom": "https://esm.sh/react-dom@19",
    "react-dom/client": "https://esm.sh/react-dom@19/client",
    "react/jsx-runtime": "https://esm.sh/react@19/jsx-runtime",
    "react/jsx-dev-runtime": "https://esm.sh/react@19/jsx-dev-runtime",
  };

  const transformedFiles = new Map<string, string>(); // path -> blob URL
  const existingFiles = new Set(files.keys()); // All available files
  const allImports = new Set<string>(); // Imports needing resolution
  const allCssImports = new Set<{ from: string; cssPath: string }>(); // CSS imports to process
  let collectedStyles = ""; // All CSS concatenated
  const errors: Array<{ path: string; error: string }> = [];

  // PASS 1: Transform all JS/TS files to blob URLs and collect import requirements
  for (const [path, content] of files) {
    if (
      path.endsWith(".js") ||
      path.endsWith(".jsx") ||
      path.endsWith(".ts") ||
      path.endsWith(".tsx")
    ) {
      // Transform JSX to JavaScript
      const { code, error, missingImports, cssImports } = transformJSX(
        content,
        path,
        existingFiles
      );

      // Track syntax errors but continue processing other files
      if (error) {
        errors.push({ path, error });
        continue;
      }

      // Create blob URL for transformed code (data URL for browser ESM)
      const blobUrl = createBlobURL(code);
      transformedFiles.set(path, blobUrl);

      // Process imports extracted by transformJSX
      if (missingImports) {
        missingImports.forEach((imp) => {
          // Distinguish third-party packages from local imports
          const isPackage = !imp.startsWith(".") &&
                            !imp.startsWith("/") &&
                            !imp.startsWith("@/");

          if (isPackage) {
            // Third-party packages: map to esm.sh CDN (e.g., "lodash" -> esm.sh/lodash)
            imports[imp] = `https://esm.sh/${imp}`;
          } else {
            // Local imports: collect for path resolution below
            allImports.add(imp);
          }
        });
      }

      // Collect CSS imports for processing
      if (cssImports) {
        cssImports.forEach((cssImport) => {
          allCssImports.add({ from: path, cssPath: cssImport });
        });
      }

      // Add all possible ways to import this file to the import map
      // This ensures flexibility in import syntax (e.g., with/without extension, with/without /)

      // Absolute path: /App.jsx
      imports[path] = blobUrl;

      // Without leading slash: App.jsx
      if (path.startsWith("/")) {
        imports[path.substring(1)] = blobUrl;
      }

      // With @/ alias: @/App.jsx (pointing to root)
      if (path.startsWith("/")) {
        imports["@" + path] = blobUrl;
        imports["@/" + path.substring(1)] = blobUrl;
      }

      // Without file extension: /App (matches import from "App")
      const pathWithoutExt = path.replace(/\.(jsx?|tsx?)$/, "");
      imports[pathWithoutExt] = blobUrl;

      if (path.startsWith("/")) {
        imports[pathWithoutExt.substring(1)] = blobUrl;
        imports["@" + pathWithoutExt] = blobUrl;
        imports["@/" + pathWithoutExt.substring(1)] = blobUrl;
      }
    } else if (path.endsWith(".css")) {
      // Collect CSS files to be injected into <style> tag
      collectedStyles += `/* ${path} */\n${content}\n\n`;
    }
  }

  // PASS 2: Resolve CSS imports by path (relative to importing file)
  for (const { from, cssPath } of allCssImports) {
    let resolvedPath = cssPath;

    if (cssPath.startsWith("@/")) {
      // @/ alias: @/styles.css -> /styles.css
      resolvedPath = cssPath.replace("@/", "/");
    } else if (cssPath.startsWith("./") || cssPath.startsWith("../")) {
      // Relative path: resolve relative to importing file's directory
      const fromDir = from.substring(0, from.lastIndexOf("/"));
      resolvedPath = resolveRelativePath(fromDir, cssPath);
    }

    // Check if resolved CSS file exists in project
    if (files.has(resolvedPath)) {
      // Already collected in Pass 1
    } else {
      // CSS file not found: add comment for debugging
      collectedStyles += `/* ${cssPath} not found */\n`;
    }
  }

  // PASS 3: Resolve local imports (relative paths, @/ paths) to blob URLs or create stubs
  for (const importPath of allImports) {
    // Skip if already in import map or is React internal
    if (imports[importPath] || importPath.startsWith("react")) {
      continue;
    }

    // Check if this is a third-party package (no path separators or relative indicators)
    const isPackage = !importPath.startsWith(".") &&
                      !importPath.startsWith("/") &&
                      !importPath.startsWith("@/");

    if (isPackage) {
      // Map third-party packages to esm.sh CDN
      const packageUrl = `https://esm.sh/${importPath}`;
      imports[importPath] = packageUrl;
      continue;
    }

    // For local imports, check if file exists in various forms
    let found = false;
    // Try variations: with/without extensions, with/without @/ alias
    const variations = [
      importPath,
      importPath + ".jsx",
      importPath + ".tsx",
      importPath + ".js",
      importPath + ".ts",
      importPath.replace("@/", "/"),
      importPath.replace("@/", "/") + ".jsx",
      importPath.replace("@/", "/") + ".tsx",
    ];

    for (const variant of variations) {
      if (imports[variant] || files.has(variant)) {
        found = true;
        break;
      }
    }

    // If import still not found, create a placeholder module to prevent complete failure
    if (!found) {
      // Extract a reasonable component name from the path
      const match = importPath.match(/\/([^\/]+)$/);
      const componentName = match
        ? match[1]
        : importPath.replace(/[^a-zA-Z0-9]/g, "");

      // Create a stub component that renders empty div
      const placeholderCode = createPlaceholderModule(componentName);
      const placeholderUrl = createBlobURL(placeholderCode);

      // Add all import variations pointing to this stub
      imports[importPath] = placeholderUrl;
      if (importPath.startsWith("@/")) {
        imports[importPath.replace("@/", "/")] = placeholderUrl;
        imports[importPath.replace("@/", "")] = placeholderUrl;
      }
    }
  }

  return {
    importMap: JSON.stringify({ imports }, null, 2), // JSON string for <script type="importmap">
    styles: collectedStyles, // All CSS injected into <style> tag
    errors // Syntax errors to display to user
  };
}

// Helper function to resolve relative paths
function resolveRelativePath(fromDir: string, relativePath: string): string {
  const parts = fromDir.split("/").filter(Boolean);
  const relParts = relativePath.split("/");
  
  for (const part of relParts) {
    if (part === "..") {
      parts.pop();
    } else if (part !== ".") {
      parts.push(part);
    }
  }
  
  return "/" + parts.join("/");
}

// Generate the HTML that runs in the preview iframe
// Combines: import map, CSS styles, and either error display or app loading
// If syntax errors exist, shows them instead of attempting to load the app
export function createPreviewHTML(
  entryPoint: string,
  importMap: string,
  styles: string = "",
  errors: Array<{ path: string; error: string }> = []
): string {
  // Resolve the entry point (e.g., "/App.jsx") to its blob URL using the import map
  let entryPointUrl = entryPoint;
  try {
    const importMapObj = JSON.parse(importMap);
    if (importMapObj.imports && importMapObj.imports[entryPoint]) {
      entryPointUrl = importMapObj.imports[entryPoint];
    }
  } catch (e) {
    console.error("Failed to parse import map:", e);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <!-- Load Tailwind CSS from CDN for styling -->
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* Reset and sizing */
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #root {
      width: 100vw;
      height: 100vh;
    }
    /* Error boundary styling when app component throws */
    .error-boundary {
      color: red;
      padding: 1rem;
      border: 2px solid red;
      margin: 1rem;
      border-radius: 4px;
      background: #fee;
    }
    /* Syntax error display (shown before app loads) */
    .syntax-errors {
      background: #fef5f5;
      border: 2px solid #ff6b6b;
      border-radius: 12px;
      padding: 32px;
      margin: 24px;
      font-family: 'SF Mono', Monaco, Consolas, 'Courier New', monospace;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .syntax-errors h3 {
      color: #dc2626;
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .syntax-errors .error-item {
      margin: 16px 0;
      padding: 16px;
      background: #fff;
      border-radius: 8px;
      border-left: 4px solid #ff6b6b;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    .syntax-errors .error-path {
      font-weight: 600;
      color: #991b1b;
      font-size: 15px;
      margin-bottom: 8px;
    }
    .syntax-errors .error-message {
      color: #7c2d12;
      margin-top: 8px;
      white-space: pre-wrap;
      line-height: 1.5;
      font-size: 13px;
    }
    .syntax-errors .error-location {
      display: inline-block;
      background: #fee0e0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      margin-left: 8px;
      color: #991b1b;
    }
  </style>
  ${styles ? `<style>\n${styles}</style>` : ''}
  <!-- Import map for ESM module resolution -->
  <script type="importmap">
    ${importMap}
  </script>
</head>
<body>
  <!-- Show syntax errors if present (Babel transform failures) -->
  ${errors.length > 0 ? `
    <div class="syntax-errors">
      <h3>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="flex-shrink: 0;">
          <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15h-2v-2h2v2zm0-4h-2V5h2v6z" fill="#dc2626"/>
        </svg>
        Syntax Error${errors.length > 1 ? 's' : ''} (${errors.length})
      </h3>
      ${errors.map(e => {
        // Extract line:column info from error message
        const locationMatch = e.error.match(/\((\d+:\d+)\)/);
        const location = locationMatch ? locationMatch[1] : '';
        const cleanError = e.error.replace(/\(\d+:\d+\)/, '').trim();

        return `
        <div class="error-item">
          <div class="error-path">
            ${e.path}
            ${location ? `<span class="error-location">${location}</span>` : ''}
          </div>
          <div class="error-message">${cleanError.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
      `;
      }).join('')}
    </div>
  ` : ''}
  <!-- Root div for React app mounting -->
  <div id="root"></div>
  <!-- App loader script (only if no syntax errors) -->
  ${errors.length === 0 ? `<script type="module">
    import React from 'react';
    import ReactDOM from 'react-dom/client';

    // Error boundary component to catch runtime errors in the app
    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }

      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }

      componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
      }

      render() {
        if (this.state.hasError) {
          return React.createElement('div', { className: 'error-boundary' },
            React.createElement('h2', null, 'Something went wrong'),
            React.createElement('pre', null, this.state.error?.toString())
          );
        }

        return this.props.children;
      }
    }

    async function loadApp() {
      try {
        // Dynamically import the entry point module
        const module = await import('${entryPointUrl}');
        // Look for default export or named "App" export
        const App = module.default || module.App;

        if (!App) {
          throw new Error('No default export or App export found in ${entryPoint}');
        }

        // Mount app in React root with error boundary
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(
          React.createElement(ErrorBoundary, null,
            React.createElement(App)
          )
        );
      } catch (error) {
        console.error('Failed to load app:', error);
        console.error('Import map:', ${JSON.stringify(importMap)});
        // Show error in UI if module loading fails
        document.getElementById('root').innerHTML = '<div class="error-boundary"><h2>Failed to load app</h2><pre>' + error.toString() + '</pre></div>';
      }
    }

    loadApp();
  </script>` : ''}
</body>
</html>`;
}
