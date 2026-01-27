"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Settings, Check, X, Eye, EyeOff, Loader2, Key, Shield, Sparkles, AlertCircle, ExternalLink } from "lucide-react";
import { AnimatedCheckmark } from "@/components/ui/animated-checkmark";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import { PROVIDER_KEY_URLS } from "@/lib/provider-errors";
import type { ValidationResult, ProviderStatus, SettingsResponse } from "@/lib/api-types";
import { Skeleton } from "@/components/ui/skeleton";

// Validation states for UX feedback
type ValidationState = "idle" | "validating" | "valid" | "invalid";

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<Record<string, ProviderStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProvider, setEditingProvider] = useState<ProviderId | null>(null);
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  // Toast notifications
  const { success, error: toastError } = useToast();

  // Validation state
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Fetch provider status when dialog opens
  useEffect(() => {
    if (open) {
      fetchProviders();
    }
  }, [open]);

  // Reset validation state when editing provider changes
  useEffect(() => {
    setValidationState("idle");
    setValidationMessage(null);
  }, [editingProvider]);

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data: SettingsResponse = await res.json();
      setProviders(data.providers);
    } catch (err) {
      setError("Failed to load settings");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const validateApiKey = async (providerId: ProviderId, apiKey: string): Promise<ValidationResult> => {
    const res = await fetch("/api/settings/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: providerId, apiKey }),
    });

    if (!res.ok) {
      throw new Error("Validation request failed");
    }

    return res.json();
  };

  const saveApiKey = async (providerId: ProviderId) => {
    if (!newKey.trim()) {
      setEditingProvider(null);
      setNewKey("");
      return;
    }

    setError(null);

    // Step 1: Validate the API key
    setValidationState("validating");
    setValidationMessage("Verifying your API key with " + PROVIDERS[providerId].name + "...");

    try {
      const validationResult = await validateApiKey(providerId, newKey.trim());

      if (!validationResult.valid) {
        setValidationState("invalid");
        setValidationMessage(
          validationResult.error?.message ||
          `Invalid API key for ${PROVIDERS[providerId].name}`
        );
        return;
      }

      // Step 2: Key is valid, now save it
      setValidationState("valid");
      setValidationMessage("API key verified! Saving...");
      setSaving(true);

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKeys: { [providerId]: newKey } }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save API key");
      }

      const data: { providers: Record<string, ProviderStatus> } = await res.json();

      // Mark as validated in local state
      data.providers[providerId] = {
        ...data.providers[providerId],
        validated: true,
      };

      setProviders(data.providers);
      setEditingProvider(null);
      setNewKey("");
      setShowKey(false);
      setValidationState("idle");
      setValidationMessage(null);

      // Show success toast
      success(
        `${PROVIDERS[providerId].name} API key saved`,
        "Your API key has been verified and encrypted."
      );
    } catch (err) {
      if (validationState === "validating") {
        setValidationState("invalid");
        setValidationMessage(err instanceof Error ? err.message : "Validation failed");
      } else {
        setError(err instanceof Error ? err.message : "Failed to save API key");
        setValidationState("idle");
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteApiKey = async (providerId: ProviderId) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKeys: { [providerId]: "" } }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete API key");
      }

      const data: { providers: Record<string, ProviderStatus> } = await res.json();
      setProviders(data.providers);

      // Show success toast
      success(
        `${PROVIDERS[providerId].name} API key removed`,
        "Your API key has been deleted."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete API key");
      toastError("Failed to delete API key", err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingProvider(null);
    setNewKey("");
    setShowKey(false);
    setValidationState("idle");
    setValidationMessage(null);
  };

  const getKeyUrl = (providerId: ProviderId) => PROVIDER_KEY_URLS[providerId];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent/50" title="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg border-border/50 bg-card">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Key className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg">API Settings</DialogTitle>
              <DialogDescription className="text-sm">
                Configure your AI provider API keys
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex flex-col gap-3 p-4 border border-border/50 rounded-xl bg-secondary/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton variant="rectangular" className="h-8 w-8 rounded-lg" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {(Object.entries(PROVIDERS) as [ProviderId, typeof PROVIDERS[ProviderId]][]).map(
              ([id, config]) => {
                const status = providers[id];
                const isEditing = editingProvider === id;

                return (
                  <div
                    key={id}
                    className="flex flex-col gap-3 p-4 border border-border/50 rounded-xl bg-secondary/20 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          status?.configured
                            ? "bg-green-500/10 text-green-500 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Label className="font-medium text-foreground">{config.name}</Label>
                            <a
                              href={getKeyUrl(id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title={`Get ${config.name} API key`}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          {status?.configured && (
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-0.5">
                              <Check className="h-3 w-3" />
                              {status.source === "env" ? "Environment" : `...${status.lastFour}`}
                              {status.validated && (
                                <span className="ml-1 text-green-500">(verified)</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {!isEditing && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-border/50"
                            onClick={() => {
                              setEditingProvider(id);
                              setNewKey("");
                            }}
                          >
                            {status?.configured && status.source === "user"
                              ? "Update"
                              : "Add Key"}
                          </Button>
                          {status?.configured && status.source === "user" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => deleteApiKey(id)}
                              disabled={saving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {isEditing && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showKey ? "text" : "password"}
                              placeholder={`Enter ${config.name} API key`}
                              value={newKey}
                              onChange={(e) => setNewKey(e.target.value)}
                              className="pr-10 bg-background border-border/50"
                              disabled={validationState === "validating" || saving}
                            />
                            <button
                              type="button"
                              onClick={() => setShowKey(!showKey)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showKey ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <Button
                            size="sm"
                            className="h-9 w-9 p-0 bg-primary hover:bg-primary/90"
                            onClick={() => saveApiKey(id)}
                            disabled={validationState === "validating" || saving || !newKey.trim()}
                          >
                            {validationState === "validating" || saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : validationState === "valid" ? (
                              <AnimatedCheckmark size="sm" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0"
                            onClick={cancelEdit}
                            disabled={validationState === "validating" || saving}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Validation feedback */}
                        {validationState !== "idle" && validationMessage && (
                          <div className={`flex items-start gap-2 text-xs p-2 rounded-md ${
                            validationState === "validating"
                              ? "bg-primary/5 text-primary border border-primary/20"
                              : validationState === "valid"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                              : "bg-destructive/10 text-destructive border border-destructive/20"
                          }`}>
                            {validationState === "validating" && (
                              <Loader2 className="h-3 w-3 animate-spin mt-0.5 flex-shrink-0" />
                            )}
                            {validationState === "valid" && (
                              <AnimatedCheckmark size="sm" className="mt-0.5 flex-shrink-0" />
                            )}
                            {validationState === "invalid" && (
                              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <span>{validationMessage}</span>
                              {validationState === "invalid" && (
                                <a
                                  href={getKeyUrl(id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block mt-1 text-primary hover:underline"
                                >
                                  Get a new API key from {config.name}
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {status?.source === "env" && (
                      <p className="text-xs text-muted-foreground">
                        Configured via environment variable. Add a user key to override.
                      </p>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}

        <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2 p-3 bg-secondary/30 rounded-lg border border-border/30">
          <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground mb-1">How we handle your API keys:</p>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>Keys are encrypted with AES-256-GCM before storage</li>
              <li>Keys are verified with the provider when you save</li>
              <li>Keys are never exposed to the browser after saving</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
