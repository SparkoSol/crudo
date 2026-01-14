import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-16 w-16",
  lg: "h-24 w-24",
};

export const Loading = ({
  message = "Loading...",
  fullScreen = false,
  size = "md",
  className,
}: LoadingProps) => {
  const containerClasses = fullScreen
    ? "fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-md z-50"
    : "flex items-center justify-center py-12";

  return (
    <div className={cn(containerClasses, className)}>
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <Loader2
            className={cn(
              "animate-spin text-brand-primary-600",
              sizeClasses[size]
            )}
            strokeWidth={2.5}
          />
          <div
            className={cn(
              "absolute inset-0 rounded-full bg-gradient-to-r from-brand-primary-400/30 via-brand-primary-500/20 to-brand-secondary-400/30 blur-xl animate-pulse",
              sizeClasses[size]
            )}
          />
          <div
            className={cn(
              "absolute inset-0 rounded-full border-2 border-brand-primary-200 animate-ping opacity-75",
              sizeClasses[size]
            )}
          />
        </div>
        {message && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-base font-semibold text-gray-700 tracking-wide">
              {message}
            </p>
            <div className="flex gap-2">
              <div className="h-2 w-2 rounded-full bg-brand-primary-500 animate-bounce [animation-delay:-0.3s]" />
              <div className="h-2 w-2 rounded-full bg-brand-primary-500 animate-bounce [animation-delay:-0.15s]" />
              <div className="h-2 w-2 rounded-full bg-brand-primary-500 animate-bounce" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
