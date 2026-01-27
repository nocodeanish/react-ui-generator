"use client";

import { useEffect, useRef, useState } from "react";
import { useFileSystem } from "@/lib/contexts/file-system-context";
import {
  createImportMap,
  createPreviewHTML,
} from "@/lib/transform/jsx-transformer";
import { AlertCircle, Zap, MonitorSmartphone, Loader2 } from "lucide-react";
import { PREVIEW_LOADING_MESSAGES } from "@/lib/design-tokens";

export function PreviewFrame() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { getAllFiles, refreshTrigger } = useFileSystem();
  const [error, setError] = useState<string | null>(null);
  const [entryPoint, setEntryPoint] = useState<string>("/App.jsx");
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isCompiling, setIsCompiling] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  // Rotate loading messages during compilation
  useEffect(() => {
    if (!isCompiling) {
      setLoadingMsgIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingMsgIndex((i) => (i + 1) % PREVIEW_LOADING_MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [isCompiling]);

  useEffect(() => {
    const updatePreview = () => {
      try {
        const files = getAllFiles();

        // Clear error first when we have files
        if (files.size > 0 && error) {
          setError(null);
        }

        // Find the entry point - look for App.jsx, App.tsx, index.jsx, or index.tsx
        let foundEntryPoint = entryPoint;
        const possibleEntries = [
          "/App.jsx",
          "/App.tsx",
          "/index.jsx",
          "/index.tsx",
          "/src/App.jsx",
          "/src/App.tsx",
        ];

        if (!files.has(entryPoint)) {
          const found = possibleEntries.find((path) => files.has(path));
          if (found) {
            foundEntryPoint = found;
            setEntryPoint(found);
          } else if (files.size > 0) {
            // Just use the first .jsx/.tsx file found
            const firstJSX = Array.from(files.keys()).find(
              (path) => path.endsWith(".jsx") || path.endsWith(".tsx")
            );
            if (firstJSX) {
              foundEntryPoint = firstJSX;
              setEntryPoint(firstJSX);
            }
          }
        }

        if (files.size === 0) {
          if (isFirstLoad) {
            setError("firstLoad");
          } else {
            setError("No files to preview");
          }
          return;
        }

        // We have files, so it's no longer the first load
        if (isFirstLoad) {
          setIsFirstLoad(false);
        }

        if (!foundEntryPoint || !files.has(foundEntryPoint)) {
          setError(
            "No React component found. Create an App.jsx or index.jsx file to get started."
          );
          return;
        }

        setIsCompiling(true);
        const { importMap, styles, errors } = createImportMap(files);
        const previewHTML = createPreviewHTML(foundEntryPoint, importMap, styles, errors);

        if (iframeRef.current) {
          const iframe = iframeRef.current;

          // Need both allow-scripts and allow-same-origin for blob URLs in import map
          iframe.setAttribute(
            "sandbox",
            "allow-scripts allow-same-origin allow-forms"
          );
          iframe.srcdoc = previewHTML;

          setError(null);
        }
        setIsCompiling(false);
      } catch (err) {
        console.error("Preview error:", err);
        setError(err instanceof Error ? err.message : "Unknown preview error");
      }
    };

    updatePreview();
  }, [refreshTrigger, getAllFiles, entryPoint, error, isFirstLoad]);

  if (error) {
    if (error === "firstLoad") {
      return (
        <div className="h-full flex items-center justify-center p-8">
          <div className="text-center max-w-sm animate-fade-in">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary mb-4 animate-breathing">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">
              Live Preview
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your component will appear here once generated
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <MonitorSmartphone className="h-3.5 w-3.5" />
              <span>Real-time rendering</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-muted border border-border mb-4">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">
            No Preview Available
          </h3>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground/70 mt-3">
            Create a React component using the AI assistant
          </p>
        </div>
      </div>
    );
  }

  // Show compiling state
  if (isCompiling) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">
            {PREVIEW_LOADING_MESSAGES[loadingMsgIndex]}
          </h3>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
            <span>Building preview...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      className="w-full h-full border-0 bg-white"
      title="Preview"
    />
  );
}
