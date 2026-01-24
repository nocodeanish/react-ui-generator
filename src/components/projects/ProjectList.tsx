"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Trash2, FolderOpen, Plus, Loader2, Pencil, MoreHorizontal, Trash, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteProject } from "@/actions/delete-project";
import { deleteAllProjects } from "@/actions/delete-all-projects";
import { renameProject } from "@/actions/rename-project";
import { createProject } from "@/actions/create-project";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectListProps {
  projects: Project[];
  currentProjectId?: string;
}

export function ProjectList({ projects, currentProjectId }: ProjectListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleDelete = async (project: Project) => {
    setDeletingId(project.id);
    setConfirmDelete(null);

    const result = await deleteProject(project.id);

    if (result.success) {
      // If we deleted the current project, navigate to another one or home
      if (project.id === currentProjectId) {
        const remainingProjects = projects.filter((p) => p.id !== project.id);
        if (remainingProjects.length > 0) {
          router.push(`/${remainingProjects[0].id}`);
        } else {
          router.push("/");
        }
      }
      router.refresh();
    } else {
      console.error("Failed to delete:", result.error);
    }

    setDeletingId(null);
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    setConfirmDeleteAll(false);

    const result = await deleteAllProjects();

    if (result.success) {
      router.push("/");
      router.refresh();
    } else {
      console.error("Failed to delete all:", result.error);
    }

    setIsDeletingAll(false);
  };

  const handleNewDesign = async () => {
    setIsCreating(true);
    try {
      const project = await createProject();
      router.push(`/${project.id}`);
      router.refresh();
    } catch (error) {
      console.error("Failed to create project:", error);
    }
    setIsCreating(false);
  };

  const startRename = (project: Project) => {
    setEditingId(project.id);
    setEditingName(project.name);
  };

  const handleRename = async (projectId: string) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }

    const result = await renameProject(projectId, editingName.trim());

    if (result.success) {
      router.refresh();
    } else {
      console.error("Failed to rename:", result.error);
    }

    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, projectId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRename(projectId);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-sidebar-foreground">Your Designs</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            onClick={handleNewDesign}
            disabled={isCreating}
            className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                New
              </>
            )}
          </Button>

          {projects.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-sidebar-accent">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setConfirmDeleteAll(true)}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  disabled={isDeletingAll}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete All Designs
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="h-12 w-12 rounded-lg bg-secondary border border-border flex items-center justify-center mb-4">
              <FolderOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-sidebar-foreground">No designs yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">
              Create your first design to start building beautiful components
            </p>
          </div>
        ) : (
          <ul className="py-2">
            {projects.map((project) => {
              const isActive = project.id === currentProjectId;
              const isDeleting = deletingId === project.id;
              const isEditing = editingId === project.id;

              return (
                <li
                  key={project.id}
                  className="px-2 mb-0.5"
                >
                  {isEditing ? (
                    <div className="px-2 py-2">
                      <Input
                        ref={inputRef}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, project.id)}
                        onBlur={() => handleRename(project.id)}
                        className="h-9 text-sm bg-background"
                        placeholder="Project name"
                      />
                    </div>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => !isDeleting && router.push(`/${project.id}`)}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && !isDeleting) {
                          e.preventDefault();
                          router.push(`/${project.id}`);
                        }
                      }}
                      className={`group w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer ${
                        isActive
                          ? "bg-sidebar-accent shadow-sm border border-sidebar-border"
                          : "hover:bg-sidebar-accent/50"
                      } ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary/70"
                        } transition-colors`}>
                          <FolderOpen className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className={`text-sm font-medium truncate ${
                            isActive ? "text-sidebar-foreground" : "text-sidebar-foreground"
                          }`}>
                            {project.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(project.updatedAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startRename(project);
                            }}
                            disabled={isDeleting}
                            className="p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                            title="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(project);
                            }}
                            disabled={isDeleting}
                            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Delete Single Project Confirmation */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent className="border-border/50 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Design</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete &quot;{confirmDelete?.name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/50">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation */}
      <AlertDialog
        open={confirmDeleteAll}
        onOpenChange={setConfirmDeleteAll}
      >
        <AlertDialogContent className="border-border/50 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Designs</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete all {projects.length} design{projects.length !== 1 ? "s" : ""}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/50">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {isDeletingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete All"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
