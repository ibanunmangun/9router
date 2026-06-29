"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Card, Button, Badge, Toggle, ConfirmModal } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import ApiKeyDrawer from "./ApiKeyDrawer";

function maskKey(key) {
  if (!key) return "—";
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-4);
  return `${prefix}••••••${suffix}`;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

function ModelBadge({ pattern }) {
  // Determine badge variant based on pattern syntax
  const isWildcard = pattern.includes("*");
  const isDeny = pattern.startsWith("!");
  const display = isDeny ? pattern : pattern;
  return (
    <Badge
      variant={isDeny ? "error" : isWildcard ? "primary" : "default"}
      size="sm"
      title={pattern}
    >
      {display}
    </Badge>
  );
}

function ApiKeyRow({ apiKey, onEdit, onDelete, onToggle, visibleKeys, onToggleVisibility, copied, onCopy }) {
  const hasRestrictions = apiKey.allowedModels && apiKey.allowedModels.length > 0;
  const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date();

  return (
    <div className={`group flex flex-col gap-3 px-4 py-3 border-b border-black/[0.03] dark:border-white/[0.03] last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6 ${apiKey.isActive === false ? "opacity-60" : ""} ${isExpired ? "opacity-80" : ""}`}>
      {/* Left: info */}
      <div className="flex-1 min-w-0">
        {/* Name */}
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{apiKey.name || "Unnamed"}</p>
          {hasRestrictions && <Badge variant="warning" size="sm">Restricted</Badge>}
        </div>

        {/* Key value row */}
        <div className="flex min-w-0 items-center gap-2 mt-1">
          <code className="flex-1 min-w-0 truncate text-xs text-text-muted font-mono">
            {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
          </code>
          <button
            onClick={() => onToggleVisibility(apiKey.id)}
            className="shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-text-muted hover:text-primary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
            title={visibleKeys.has(apiKey.id) ? "Hide key" : "Show key"}
          >
            <span className="material-symbols-outlined text-[14px]">
              {visibleKeys.has(apiKey.id) ? "visibility_off" : "visibility"}
            </span>
          </button>
          <button
            onClick={() => onCopy(apiKey.key, apiKey.id)}
            className="shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-text-muted hover:text-primary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
            title="Copy key"
          >
            <span className="material-symbols-outlined text-[14px]">
              {copied === apiKey.id ? "check" : "content_copy"}
            </span>
          </button>
          <button
            onClick={() => onEdit(apiKey)}
            className="shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-text-muted hover:text-primary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
            title="Edit key"
          >
            <span className="material-symbols-outlined text-[14px]">edit</span>
          </button>
        </div>

        <p className="text-xs text-text-muted mt-1">
          Created {formatDate(apiKey.createdAt)}
        </p>

        {(apiKey.isActive === false || isExpired || apiKey.lastUsedAt || apiKey.expiresAt) && (
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {apiKey.isActive === false && <Badge variant="default" size="sm">Paused</Badge>}
            {isExpired && <Badge variant="error" size="sm">Expired</Badge>}
            <span className="text-xs text-text-muted">
              {[
                apiKey.lastUsedAt && `Last used ${formatDate(apiKey.lastUsedAt)}`,
                apiKey.expiresAt && !isExpired && `Expires ${new Date(apiKey.expiresAt).toLocaleDateString()}`,
              ].filter(Boolean).join(" · ")}
            </span>
          </div>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center justify-end gap-1 shrink-0">
        <Toggle
          size="sm"
          checked={apiKey.isActive ?? true}
          onChange={(checked) => onToggle(apiKey.id, checked)}
          title={apiKey.isActive ? "Pause key" : "Resume key"}
        />
        <button
          onClick={() => onDelete(apiKey.id, apiKey.name)}
          className="p-1.5 hover:bg-red-500/10 rounded text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          title="Delete key"
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
        </button>
      </div>
    </div>
  );
}

export default function ApiKeysClient() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState(new Set());
  const [editKey, setEditKey] = useState(null); // null = create mode
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [confirmState, setConfirmState] = useState(null);
  const [activeProviders, setActiveProviders] = useState([]);

  const { copied, copy } = useCopyToClipboard();

  const fetchKeys = async () => {
    try {
      const [keysRes, providersRes] = await Promise.all([
        fetch("/api/keys"),
        fetch("/api/providers"),
      ]);
      if (keysRes.ok) {
        const data = await keysRes.json();
        setKeys(data.keys || []);
      }
      if (providersRes.ok) {
        const data = await providersRes.json();
        setActiveProviders(data.connections || []);
      }
    } catch (e) {
      console.error("Failed to fetch keys:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const toggleVisibility = (id) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggle = async (id, checked) => {
    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: checked }),
      });
      if (res.ok) {
        const data = await res.json();
        setKeys((prev) => prev.map((k) => k.id === id ? { ...k, ...data.key } : k));
      }
    } catch (e) {
      console.error("Failed to toggle key:", e);
    }
  };

  const handleDelete = (id, name) => {
    setConfirmState({
      title: "Delete API Key",
      message: `Delete API key "${name}"? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
          if (res.ok) {
            setKeys((prev) => prev.filter((k) => k.id !== id));
          }
        } catch (e) {
          console.error("Failed to delete key:", e);
        }
      },
    });
  };

  const handleEdit = (key) => {
    setEditKey(key);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setEditKey(null);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditKey(null);
  };

  const handleSaved = (savedKey, isNew) => {
    if (isNew) {
      setKeys((prev) => [savedKey, ...prev]);
    } else {
      setKeys((prev) => prev.map((k) => k.id === savedKey.id ? savedKey : k));
    }
    setDrawerOpen(false);
    setEditKey(null);
  };

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">vpn_key</span>
            API Keys
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Manage API keys with model-scoped access control
          </p>
        </div>
        <Button icon="add" onClick={handleCreate} className="w-full sm:w-auto">
          Create Key
        </Button>
      </div>

      {/* Keys card */}
      <Card padding="none">
        {loading ? (
          <div className="p-8 text-center text-text-muted">
            <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
            <p className="mt-2 text-sm">Loading...</p>
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <span className="material-symbols-outlined text-[32px]">vpn_key</span>
            </div>
            <p className="text-text-main font-medium mb-1">No API keys yet</p>
            <p className="text-sm text-text-muted mb-4">
              Create your first key to authenticate against 9Router
            </p>
            <Button icon="add" onClick={handleCreate}>
              Create API Key
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
            {keys.map((key) => (
              <ApiKeyRow
                key={key.id}
                apiKey={key}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
                visibleKeys={visibleKeys}
                onToggleVisibility={toggleVisibility}
                copied={copied}
                onCopy={copy}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Create / Edit Drawer */}
      <ApiKeyDrawer
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
        editKey={editKey}
        onSaved={handleSaved}
        activeProviders={activeProviders}
      />

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={confirmState?.onConfirm}
        title={confirmState?.title || "Confirm"}
        message={confirmState?.message}
        variant="danger"
      />
    </div>
  );
}

ApiKeysClient.propTypes = {};
