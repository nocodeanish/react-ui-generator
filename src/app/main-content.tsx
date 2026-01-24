"use client";

import { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { FileSystemProvider } from "@/lib/contexts/file-system-context";
import { ChatProvider } from "@/lib/contexts/chat-context";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { FileTree } from "@/components/editor/FileTree";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { PreviewFrame } from "@/components/preview/PreviewFrame";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeaderActions } from "@/components/HeaderActions";
import { ProviderSelector } from "@/components/editor/ProviderSelector";
import { ProjectList } from "@/components/projects/ProjectList";
import { useChat } from "@/lib/contexts/chat-context";
import { type ProviderId } from "@/lib/providers";
import { PanelLeftClose, PanelLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MainContentProps {
  user?: {
    id: string;
    email: string;
  } | null;
  project?: {
    id: string;
    name: string;
    messages: any[];
    data: any;
    provider: string;
    model: string;
    createdAt: Date;
    updatedAt: Date;
  };
  projects?: Project[];
}

// Inner component that uses chat context for provider state
function EditorHeader({
  activeView,
  setActiveView,
  user,
  projectId,
}: {
  activeView: "preview" | "code";
  setActiveView: (view: "preview" | "code") => void;
  user?: MainContentProps["user"];
  projectId?: string;
}) {
  const { provider, model, setProviderAndModel } = useChat();

  return (
    <div className="h-14 border-b border-border/50 px-6 flex items-center justify-between bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <Tabs
          value={activeView}
          onValueChange={(v) => setActiveView(v as "preview" | "code")}
        >
          <TabsList className="bg-transparent border border-border rounded-lg p-0.5 h-9 gap-0.5">
            <TabsTrigger
              value="preview"
              className="data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground px-4 py-1.5 text-sm font-medium transition-all duration-200 rounded-md border-0"
            >
              Preview
            </TabsTrigger>
            <TabsTrigger
              value="code"
              className="data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground px-4 py-1.5 text-sm font-medium transition-all duration-200 rounded-md border-0"
            >
              Code
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <ProviderSelector
          projectId={projectId}
          provider={provider}
          model={model}
          onProviderChange={setProviderAndModel}
        />
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <HeaderActions user={user} projectId={projectId} />
      </div>
    </div>
  );
}

export function MainContent({ user, project, projects = [] }: MainContentProps) {
  const [activeView, setActiveView] = useState<"preview" | "code">("preview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <FileSystemProvider initialData={project?.data}>
      <ChatProvider
        projectId={project?.id}
        initialMessages={project?.messages}
        initialProvider={(project?.provider as ProviderId) || "anthropic"}
        initialModel={project?.model || ""}
      >
        <div className="h-screen w-screen overflow-hidden bg-background flex">
          {/* Sidebar - Project List (only for authenticated users) */}
          {user && (
            <div
              className={`h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out flex-shrink-0 ${
                sidebarOpen ? "w-72" : "w-0"
              } overflow-hidden`}
            >
              <ProjectList projects={projects} currentProjectId={project?.id} />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 h-full overflow-hidden">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Left Panel - Chat */}
              <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
                <div className="h-full flex flex-col bg-card">
                  {/* Chat Header */}
                  <div className="h-14 flex items-center px-4 border-b border-border/50 bg-card/80 backdrop-blur-sm">
                    {user && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 mr-3 hover:bg-accent/50"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                      >
                        {sidebarOpen ? (
                          <PanelLeftClose className="h-4 w-4" />
                        ) : (
                          <PanelLeft className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div>
                        <h1 className="text-sm font-semibold text-foreground">
                          {project?.name || "UIGen"}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                          AI Component Generator
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Content */}
                  <div className="flex-1 overflow-hidden">
                    <ChatInterface />
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle className="w-[1px] bg-border/50 hover:bg-primary/50 transition-colors data-[resize-handle-active]:bg-primary" />

              {/* Right Panel - Preview/Code */}
              <ResizablePanel defaultSize={65}>
                <div className="h-full flex flex-col bg-card">
                  {/* Top Bar */}
                  <EditorHeader
                    activeView={activeView}
                    setActiveView={setActiveView}
                    user={user}
                    projectId={project?.id}
                  />

                  {/* Content Area */}
                  <div className="flex-1 overflow-hidden bg-muted/30 dark:bg-background/50">
                    {activeView === "preview" ? (
                      <div className="h-full p-6 canvas-pattern">
                        {/* Preview artboard - component render area */}
                        <div className="h-full preview-artboard rounded-lg border border-border/50 overflow-hidden">
                          <PreviewFrame />
                        </div>
                      </div>
                    ) : (
                      <ResizablePanelGroup
                        direction="horizontal"
                        className="h-full"
                      >
                        {/* File Tree */}
                        <ResizablePanel
                          defaultSize={28}
                          minSize={20}
                          maxSize={40}
                        >
                          <div className="h-full bg-sidebar border-r border-border/50">
                            <FileTree />
                          </div>
                        </ResizablePanel>

                        <ResizableHandle className="w-[1px] bg-border/50 hover:bg-primary/50 transition-colors data-[resize-handle-active]:bg-primary" />

                        {/* Code Editor */}
                        <ResizablePanel defaultSize={72}>
                          <div className="h-full bg-card">
                            <CodeEditor />
                          </div>
                        </ResizablePanel>
                      </ResizablePanelGroup>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </ChatProvider>
    </FileSystemProvider>
  );
}
