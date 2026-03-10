"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

function getToolLabel(toolName: string, args: Record<string, unknown>): string {
  if (toolName === "str_replace_editor") {
    const { command, path } = args as { command?: string; path?: string };
    const file = path ?? "file";
    switch (command) {
      case "create":     return `Creating ${file}`;
      case "str_replace":
      case "insert":     return `Editing ${file}`;
      case "view":       return `Viewing ${file}`;
      default:           return `Editing ${file}`;
    }
  }

  if (toolName === "file_manager") {
    const { command, path, new_path } = args as { command?: string; path?: string; new_path?: string };
    switch (command) {
      case "rename": return `Renaming ${path} → ${new_path}`;
      case "delete": return `Deleting ${path}`;
      default:       return `File operation on ${path ?? "file"}`;
    }
  }

  return toolName;
}

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const label = getToolLabel(toolInvocation.toolName, toolInvocation.args ?? {});
  const isDone = toolInvocation.state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}

export { getToolLabel };
