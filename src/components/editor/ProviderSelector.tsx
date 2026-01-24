"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { ChevronDown, Check, Loader2 } from "lucide-react";
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
import { PROVIDERS, type ProviderId } from "@/lib/providers";

type ProviderStatus = {
  configured: boolean;
  source?: "env" | "user";
  lastFour?: string;
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
        setProviders(data.providers);
      }
    } catch (error) {
      console.error("Failed to fetch providers:", error);
    } finally {
      setLoading(false);
    }
  };

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
          className="w-[200px] justify-between"
          disabled={disabled}
        >
          <span className="truncate">
            {currentProvider.name}: {currentModel?.name || "Default"}
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
                      <span className="flex-1">{config.name}</span>
                      {!configured && (
                        <span className="text-xs text-muted-foreground">No key</span>
                      )}
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
