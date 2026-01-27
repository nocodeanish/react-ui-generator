import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
}

export function Skeleton({
  className,
  variant = "text",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-muted",
        variant === "text" && "h-4 rounded",
        variant === "circular" && "rounded-full",
        variant === "rectangular" && "rounded-lg",
        className
      )}
      {...props}
    />
  );
}

// Preset skeleton for chat messages
export function MessageSkeleton() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <Skeleton variant="circular" className="h-8 w-8 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

// Preset skeleton for project list items
export function ProjectSkeleton() {
  return (
    <div className="px-3 py-2.5 flex items-start gap-3 animate-fade-in">
      <Skeleton variant="rectangular" className="h-8 w-8 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

// Preset skeleton for file tree items
export function FileTreeSkeleton() {
  return (
    <div className="space-y-1 p-2 animate-fade-in">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1.5">
          <Skeleton className="h-4 w-4 flex-shrink-0" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

// Preset skeleton for preview loading
export function PreviewSkeleton() {
  return (
    <div className="h-full w-full flex items-center justify-center animate-fade-in">
      <div className="text-center space-y-4">
        <Skeleton variant="circular" className="h-12 w-12 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
        <Skeleton className="h-3 w-48 mx-auto" />
      </div>
    </div>
  );
}

// Preset skeleton for code editor
export function CodeEditorSkeleton() {
  return (
    <div className="p-4 space-y-2 animate-fade-in">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-6 flex-shrink-0" />
          <Skeleton
            className="h-4"
            style={{ width: `${Math.random() * 40 + 30}%` }}
          />
        </div>
      ))}
    </div>
  );
}
