import { cn } from "@/lib/utils";

interface AnimatedCheckmarkProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function AnimatedCheckmark({
  className,
  size = "md",
}: AnimatedCheckmarkProps) {
  return (
    <svg
      className={cn("text-green-500", sizeClasses[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 13l4 4L19 7" className="checkmark-animated" />
    </svg>
  );
}

// Static checkmark (no animation)
export function Checkmark({
  className,
  size = "md",
}: AnimatedCheckmarkProps) {
  return (
    <svg
      className={cn("text-green-500", sizeClasses[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
