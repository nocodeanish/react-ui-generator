"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Settings, Check, X, Eye, EyeOff, Loader2, Key, Shield, Sparkles } from "lucide-react";
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

type ProviderStatus = {
  configured: boolean;
  source?: "env" | "user";
  lastFour?: string;
};

type SettingsResponse = {
  providers: Record<string, ProviderStatus>;
};

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<Record<string, ProviderStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProvider, setEditingProvider] = useState<ProviderId | null>(null);
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  // Fetch provider status when dialog opens
  useEffect(() => {
    if (open) {
      fetchProviders();
    }
  }, [open]);

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

  const saveApiKey = async (providerId: ProviderId) => {
    if (!newKey.trim()) {
      setEditingProvider(null);
      setNewKey("");
      return;
    }

    setSaving(true);
    setError(null);
    try {
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
      setProviders(data.providers);
      setEditingProvider(null);
      setNewKey("");
      setShowKey(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save API key");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete API key");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingProvider(null);
    setNewKey("");
    setShowKey(false);
  };

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
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
                          <Label className="font-medium text-foreground">{config.name}</Label>
                          {status?.configured && (
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-0.5">
                              <Check className="h-3 w-3" />
                              {status.source === "env" ? "Environment" : `...${status.lastFour}`}
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
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showKey ? "text" : "password"}
                            placeholder={`Enter ${config.name} API key`}
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            className="pr-10 bg-background border-border/50"
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
                          disabled={saving || !newKey.trim()}
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={cancelEdit}
                          disabled={saving}
                        >
                          <X className="h-4 w-4" />
                        </Button>
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

        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 p-3 bg-secondary/30 rounded-lg border border-border/30">
          <Shield className="h-4 w-4 text-primary" />
          <span>API keys are encrypted with AES-256-GCM and never exposed to the client.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
