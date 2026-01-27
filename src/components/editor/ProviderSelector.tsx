"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Check, Loader2, AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import { PROVIDER_COLORS } from "@/lib/design-tokens";

type ValidationStatus = "unknown" | "checking" | "valid" | "invalid";

type ProviderStatus = {
  configured: boolean;
  source?: "env" | "user";
  lastFour?: string;
  // Validation status (client-side tracked)
  validationStatus?: ValidationStatus;
  validationError?: string;
};

interface ProviderSelectorProps {
  projectId?: string;
  provider: ProviderId;
  model: string;
  onProviderChange: (provider: ProviderId, model: string) => void;
  disabled?: boolean;
}

export function ProviderSelector({
  projectId,
  provider,
  model,
  onProviderChange,
  disabled = false,
}: ProviderSelectorProps) {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<Record<string, ProviderStatus>>({});
  const [loading, setLoading] = useState(true);
  const [validatingProvider, setValidatingProvider] = useState<ProviderId | null>(null);

  // Fetch available providers on mount and when dropdown opens
  useEffect(() => {
    fetchProviders();
  }, []);

  // Refresh providers when dropdown opens to pick up newly added API keys
  useEffect(() => {
    if (open) {
      fetchProviders();
    }
  }, [open]);

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        // Preserve existing validation status when refreshing
        setProviders((prev) => {
          const updated: Record<string, ProviderStatus> = {};
          for (const [id, status] of Object.entries(data.providers) as [string, ProviderStatus][]) {
            updated[id] = {
              ...status,
              validationStatus: prev[id]?.validationStatus || "unknown",
              validationError: prev[id]?.validationError,
            };
          }
          return updated;
        });
      }
    } catch (error) {
      console.error("Failed to fetch providers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Validate a provider's API key
  const validateProvider = useCallback(async (providerId: ProviderId) => {
    const status = providers[providerId];
    if (!status?.configured || status.source === "env") {
      // Can't validate env keys (we don't have access to them client-side)
      return;
    }

    setValidatingProvider(providerId);
    setProviders((prev) => ({
      ...prev,
      [providerId]: { ...prev[providerId], validationStatus: "checking" },
    }));

    try {
      // We can't validate directly from client (API key is encrypted)
      // Instead, we'll make a lightweight request through our validate endpoint
      // Note: This requires the key to be stored, so we use a special endpoint
      const res = await fetch("/api/settings/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId }),
      });

      if (res.ok) {
        const data = await res.json();
        setProviders((prev) => ({
          ...prev,
          [providerId]: {
            ...prev[providerId],
            validationStatus: data.valid ? "valid" : "invalid",
            validationError: data.error?.message,
          },
        }));
      } else {
        // If check endpoint doesn't exist, mark as unknown
        setProviders((prev) => ({
          ...prev,
          [providerId]: { ...prev[providerId], validationStatus: "unknown" },
        }));
      }
    } catch (error) {
      setProviders((prev) => ({
        ...prev,
        [providerId]: { ...prev[providerId], validationStatus: "unknown" },
      }));
    } finally {
      setValidatingProvider(null);
    }
  }, [providers]);

  const handleProviderSelect = async (selectedProvider: ProviderId) => {
    if (selectedProvider === provider) {
      setOpen(false);
      return;
    }

    const defaultModel = PROVIDERS[selectedProvider].default;
    onProviderChange(selectedProvider, defaultModel);

    // Update project settings if we have a projectId
    if (projectId) {
      try {
        await fetch(`/api/project/${projectId}/settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: selectedProvider, model: defaultModel }),
        });
      } catch (error) {
        console.error("Failed to update project settings:", error);
      }
    }

    setOpen(false);
  };

  const handleModelSelect = async (selectedModel: string) => {
    if (selectedModel === model) {
      setOpen(false);
      return;
    }

    onProviderChange(provider, selectedModel);

    // Update project settings if we have a projectId
    if (projectId) {
      try {
        await fetch(`/api/project/${projectId}/settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: selectedModel }),
        });
      } catch (error) {
        console.error("Failed to update project settings:", error);
      }
    }

    setOpen(false);
  };

  const currentProvider = PROVIDERS[provider];
  const currentModel = currentProvider.models.find((m) => m.id === model) ||
    currentProvider.models.find((m) => m.id === currentProvider.default);

  const isProviderConfigured = (id: ProviderId) => {
    return providers[id]?.configured ?? false;
  };

  // Provider icon with brand color
  const getProviderIcon = (id: ProviderId) => {
    const color = PROVIDER_COLORS[id] || "#6B7280";
    const initials: Record<ProviderId, string> = {
      anthropic: "A",
      openai: "O",
      google: "G",
      openrouter: "R",
      xai: "X",
    };
    return (
      <span
        className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {initials[id] || "?"}
      </span>
    );
  };

  const getProviderValidationStatus = (id: ProviderId): ValidationStatus => {
    return providers[id]?.validationStatus || "unknown";
  };

  // Get status icon for a provider
  const getStatusIcon = (id: ProviderId) => {
    const status = providers[id];
    if (!status?.configured) return null;

    const validationStatus = status.validationStatus || "unknown";

    if (validatingProvider === id || validationStatus === "checking") {
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
    }

    switch (validationStatus) {
      case "valid":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                API key verified
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case "invalid":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertCircle className="h-3 w-3 text-destructive" />
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs max-w-[200px]">
                {status.validationError || "API key may be invalid. Update in Settings."}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        // For env keys or unknown status, show a subtle indicator
        if (status.source === "env") {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3 w-3 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Using environment variable
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return null;
    }
  };

  // Get current provider status indicator for the button
  const getCurrentProviderStatusBadge = () => {
    const status = providers[provider];
    if (!status?.configured) return null;

    const validationStatus = status.validationStatus || "unknown";

    if (validationStatus === "invalid") {
      return (
        <span className="ml-1 h-2 w-2 rounded-full bg-destructive" title="API key issue" />
      );
    }
    if (validationStatus === "valid") {
      return (
        <span className="ml-1 h-2 w-2 rounded-full bg-green-500" title="API key verified" />
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled className="w-[200px]">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label={`Select AI provider, currently ${currentProvider.name}`}
          className="w-[220px] justify-between hover:bg-accent/50 dark:hover:bg-accent/30"
          disabled={disabled}
        >
          <span className="truncate flex items-center gap-2">
            {getProviderIcon(provider)}
            <span>
              {currentProvider.name}: {currentModel?.name || "Default"}
            </span>
            {getCurrentProviderStatusBadge()}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search provider or model..." />
          <CommandList>
            <CommandEmpty>No provider or model found.</CommandEmpty>

            <CommandGroup heading="Providers">
              {(Object.entries(PROVIDERS) as [ProviderId, typeof PROVIDERS[ProviderId]][]).map(
                ([id, config]) => {
                  const configured = isProviderConfigured(id);
                  const status = providers[id];
                  const isRecommended = id === "anthropic" && configured;
                  return (
                    <CommandItem
                      key={id}
                      value={config.name}
                      onSelect={() => handleProviderSelect(id)}
                      disabled={!configured}
                      className={!configured ? "opacity-50" : ""}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          provider === id ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      {getProviderIcon(id)}
                      <span className="flex-1 ml-2">{config.name}</span>
                      <span className="flex items-center gap-2">
                        {isRecommended && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            Best
                          </span>
                        )}
                        {configured && getStatusIcon(id)}
                        {!configured && (
                          <span className="text-xs text-muted-foreground">No key</span>
                        )}
                        {configured && status?.source === "user" && status?.lastFour && (
                          <span className="text-xs text-muted-foreground">
                            ...{status.lastFour}
                          </span>
                        )}
                      </span>
                    </CommandItem>
                  );
                }
              )}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading={`${currentProvider.name} Models`}>
              {currentProvider.models.map((modelConfig) => (
                <CommandItem
                  key={modelConfig.id}
                  value={modelConfig.name}
                  onSelect={() => handleModelSelect(modelConfig.id)}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      model === modelConfig.id || (!model && modelConfig.id === currentProvider.default)
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                  />
                  <span>{modelConfig.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
