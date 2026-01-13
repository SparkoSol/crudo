import {
  apiBaseUrl,
  mode,
  isDevelopment,
  isProduction,
  isStaging,
} from "../config/env";
import { Globe, Server } from "lucide-react";

export function EnvHeader() {
  const getEnvColor = () => {
    if (isDevelopment) return "text-blue-500";
    if (isStaging) return "text-yellow-500";
    if (isProduction) return "text-green-500";
    return "text-gray-500";
  };

  const getEnvBadgeColor = () => {
    if (isDevelopment) return "bg-blue-500/20 border-blue-500/50";
    if (isStaging) return "bg-yellow-500/20 border-yellow-500/50";
    if (isProduction) return "bg-green-500/20 border-green-500/50";
    return "bg-gray-500/20 border-gray-500/50";
  };

  const formatMode = (m: string) => {
    return m.charAt(0).toUpperCase() + m.slice(1);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${getEnvBadgeColor()} transition-all duration-300 relative`}
            >
              <div className="relative flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider animate-professional-blink">
                  {formatMode(mode)}
                </span>
                <span
                  className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${getEnvColor().replace(
                    "text-",
                    "bg-"
                  )} animate-ping`}
                  aria-hidden="true"
                />
                <span
                  className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${getEnvColor().replace(
                    "text-",
                    "bg-"
                  )}`}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <Server className="h-3.5 w-3.5 animate-professional-blink shrink-0" />
              <span className="font-mono text-xs truncate animate-professional-blink">
                {apiBaseUrl}
              </span>
            </div>
          </div>

          <div className="flex items-center shrink-0">
            <Globe className="h-4 w-4 text-muted-foreground animate-professional-blink" />
          </div>
        </div>
      </div>
    </div>
  );
}
