"use client";

import { useState } from "react";
import { MessageSquare, Code, Eye, Menu, X, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { PreviewFrame } from "@/components/preview/PreviewFrame";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { FileTree } from "@/components/editor/FileTree";
import { ProjectList } from "@/components/projects/ProjectList";
import { HeaderActions } from "@/components/HeaderActions";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MobileLayoutProps {
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

export function MobileLayout({ user, project, projects = [] }: MobileLayoutProps) {
  const [activeView, setActiveView] = useState<"chat" | "preview" | "code">("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFileTree, setShowFileTree] = useState(false);

  return (
    <div id="main-content" className="h-screen w-screen flex flex-col bg-background">
      {/* Mobile Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="h-10 w-10"
              aria-label="Open projects menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm truncate max-w-[140px]">
              {project?.name || "AI UI Generator"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <HeaderActions user={user} projectId={project?.id} />
        </div>
      </header>

      {/* Tab Content */}
      <Tabs
        value={activeView}
        onValueChange={(v) => setActiveView(v as "chat" | "preview" | "code")}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="flex-1 overflow-hidden">
          <TabsContent value="chat" className="h-full m-0 data-[state=inactive]:hidden">
            <ChatInterface />
          </TabsContent>
          <TabsContent value="preview" className="h-full m-0 p-4 canvas-pattern data-[state=inactive]:hidden">
            <div className="h-full preview-artboard rounded-lg border border-border/50 overflow-hidden">
              <PreviewFrame />
            </div>
          </TabsContent>
          <TabsContent value="code" className="h-full m-0 flex flex-col data-[state=inactive]:hidden">
            {/* File tree toggle for mobile code view */}
            <div className="flex items-center justify-between p-2 border-b border-border bg-card">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFileTree(!showFileTree)}
                className="text-xs"
              >
                {showFileTree ? "Hide Files" : "Show Files"}
              </Button>
            </div>
            <div className="flex-1 flex overflow-hidden">
              {showFileTree && (
                <div className="w-48 border-r border-border bg-sidebar flex-shrink-0 overflow-y-auto">
                  <FileTree />
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <CodeEditor />
              </div>
            </div>
          </TabsContent>
        </div>

        {/* Bottom Tab Bar - 44px min touch targets */}
        <TabsList className="h-16 rounded-none border-t border-border bg-card grid grid-cols-3 flex-shrink-0">
          <TabsTrigger
            value="chat"
            className="h-full flex flex-col items-center justify-center gap-1 rounded-none data-[state=active]:bg-accent/50 data-[state=active]:text-primary min-h-[44px]"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs">Chat</span>
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="h-full flex flex-col items-center justify-center gap-1 rounded-none data-[state=active]:bg-accent/50 data-[state=active]:text-primary min-h-[44px]"
          >
            <Eye className="h-5 w-5" />
            <span className="text-xs">Preview</span>
          </TabsTrigger>
          <TabsTrigger
            value="code"
            className="h-full flex flex-col items-center justify-center gap-1 rounded-none data-[state=active]:bg-accent/50 data-[state=active]:text-primary min-h-[44px]"
          >
            <Code className="h-5 w-5" />
            <span className="text-xs">Code</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Slide-out Sidebar Overlay */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Sidebar Panel */}
          <div className="fixed left-0 top-0 bottom-0 w-80 bg-sidebar z-50 animate-slide-right shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <span className="font-semibold text-sidebar-foreground">Your Designs</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="h-10 w-10"
                aria-label="Close projects menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="h-[calc(100%-57px)] overflow-hidden">
              <ProjectList
                projects={projects}
                currentProjectId={project?.id}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
