"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Drawer from "@/shared/components/Drawer";
import Button from "@/shared/components/Button";
import Input from "@/shared/components/Input";
import Toggle from "@/shared/components/Toggle";
import Badge from "@/shared/components/Badge";
import SegmentedControl from "@/shared/components/SegmentedControl";
import ModelSelectModal from "@/shared/components/ModelSelectModal";

const REQUEST_LIMIT_RANGE = { min: 10, max: 5000, step: 10 };
const SPEND_LIMIT_RANGE = { min: 1, max: 500, step: 1 };

/** Toggle + segmented mode + range slider for daily request/spend caps */
function DailyLimitSection({ enabled, onToggle, mode, onModeChange, value, onValueChange, disabled }) {
  const range = mode === "spend" ? SPEND_LIMIT_RANGE : REQUEST_LIMIT_RANGE;
  const display = mode === "spend" ? `$${value}` : `${value} req`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-main">Daily Limits</p>
          <p className="text-xs text-text-muted">
            Cap this key to a max requests or max spend per day
          </p>
        </div>
        <Toggle checked={enabled} onChange={onToggle} size="sm" disabled={disabled} />
      </div>

      {enabled && (
        <div className="flex min-w-0 flex-col gap-3 pl-1 border-l-2 border-primary/20">
          <SegmentedControl
            options={[
              { value: "requests", label: "Max Requests", icon: "tag" },
              { value: "spend", label: "Max Spend", icon: "attach_money" },
            ]}
            value={mode}
            onChange={onModeChange}
            size="sm"
            fullWidth
          />
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-main w-8 text-center">{mode === "spend" ? "$" : ""}</span>
              <input
                type="number"
                min={range.min}
                step={range.step}
                value={value}
                onChange={(e) => onValueChange(Math.max(range.min, Number(e.target.value)))}
                disabled={disabled}
                className="flex-1 rounded-[10px] border border-border bg-surface-2 px-3 py-1.5 text-sm text-text-main outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <span className="text-sm font-medium text-text-main w-12">{mode === "spend" ? "USD" : "req"}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {mode === "spend" 
                ? [5, 10, 50, 100].map(v => (
                    <button key={v} type="button" onClick={() => onValueChange(v)} disabled={disabled} className="w-full px-2 py-1 text-xs rounded border border-border hover:bg-surface-3 text-text-muted transition-colors">${v}</button>
                  ))
                : [100, 500, 1000, 5000].map(v => (
                    <button key={v} type="button" onClick={() => onValueChange(v)} disabled={disabled} className="w-full px-2 py-1 text-xs rounded border border-border hover:bg-surface-3 text-text-muted transition-colors">{v}</button>
                  ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Removable chip for a selected model or pattern */
function SelectionChip({ value, onRemove }) {
  const isPattern = value.includes("*");
  return (
    <Badge
      variant={isPattern ? "warning" : "primary"}
      size="sm"
      className="gap-1 pr-0.5"
    >
      <span className="max-w-full break-all">{value}</span>
      <button
        type="button"
        onClick={() => onRemove(value)}
        className="ml-0.5 hover:opacity-70 rounded"
        title="Remove"
      >
        <span className="material-symbols-outlined text-[12px]">close</span>
      </button>
    </Badge>
  );
}

/** Section: selected models shown as chips + button to open ModelSelectModal */
function ModelSelectSection({ label, selected, onRemove, onAdd, onAddPattern, activeProviders }) {
  const [showModal, setShowModal] = useState(false);
  const [patternInput, setPatternInput] = useState("");
  const [modelAliases, setModelAliases] = useState({});
  const [showPatternInput, setShowPatternInput] = useState(false);

  useEffect(() => {
    if (showModal) {
      fetch("/api/models/alias")
        .then(r => r.ok ? r.json() : {})
        .then(d => setModelAliases(d.aliases || {}))
        .catch(() => setModelAliases({}));
    }
  }, [showModal]);

  const handleAddModel = (model) => {
    const value = model?.value || model?.name || model;
    if (value && !selected.includes(value)) {
      onAdd([...selected, value]);
    }
  };

  const handleDeselectModel = (model) => {
    const value = model?.value || model?.name || model;
    onAdd(selected.filter(v => v !== value));
  };

  const handleAddPattern = () => {
    const trimmed = patternInput.trim().replace(/,+$/, "");
    if (!trimmed || selected.includes(trimmed)) { setPatternInput(""); return; }
    onAddPattern([...selected, trimmed]);
    setPatternInput("");
    setShowPatternInput(false);
  };

  const handlePatternKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); handleAddPattern(); }
    if (e.key === "Escape") { setPatternInput(""); setShowPatternInput(false); }
  };

  return (
      <div className="flex min-w-0 flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-text-main">{label}</label>}

      {/* Selected chips */}
      <div className="flex min-w-0 flex-wrap gap-1.5 min-h-[36px] w-full rounded-[10px] border border-border bg-surface-2 px-3 py-2">
        {selected.map((v) => (
          <SelectionChip key={v} value={v} onRemove={onRemove} />
        ))}
        {selected.length === 0 && (
          <span className="text-sm text-text-muted italic">None selected</span>
        )}
      </div>

      {/* Add model / add pattern buttons */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="secondary"
          size="sm"
          icon="add"
          onClick={() => setShowModal(true)}
          fullWidth
        >
          Add from List
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={showPatternInput ? "close" : "auto_awesome"}
          onClick={() => { setShowPatternInput(v => !v); setPatternInput(""); }}
          fullWidth
        >
          {showPatternInput ? "Cancel" : "Custom Pattern"}
        </Button>
      </div>

      {/* Inline custom pattern input */}
      {showPatternInput && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={patternInput}
            onChange={e => setPatternInput(e.target.value)}
            onKeyDown={handlePatternKeyDown}
            placeholder="e.g. kr/*  or  claude-sonnet*  or  openai/gpt-5"
            className="min-w-0 flex-1 rounded-[10px] border border-border bg-surface-2 px-3 py-1.5 text-sm text-text-main outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <Button size="sm" onClick={handleAddPattern} disabled={!patternInput.trim()}>
            Add
          </Button>
        </div>
      )}

      <ModelSelectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={handleAddModel}
        onDeselect={handleDeselectModel}
        activeProviders={activeProviders}
        modelAliases={modelAliases}
        title={label || "Select Models"}
        addedModelValues={selected}
        closeOnSelect={false}
      />
    </div>
  );
}

function buildForm(editKey) {
  if (!editKey) {
    return {
      name: "", isRestricted: false, allowedModels: [], expiresAt: "",
      dailyLimitEnabled: false, dailyLimitMode: "requests",
      dailyLimitValue: REQUEST_LIMIT_RANGE.min,
    };
  }
  const hasSpend = editKey.maxSpendUsdPerDay != null;
  const hasReq = editKey.maxRequestsPerDay != null;
  return {
    name: editKey.name || "",
    isRestricted: (editKey.allowedModels?.length ?? 0) > 0,
    allowedModels: editKey.allowedModels || [],
    expiresAt: editKey.expiresAt ? editKey.expiresAt.slice(0, 16) : "",
    dailyLimitEnabled: hasSpend || hasReq,
    dailyLimitMode: hasSpend ? "spend" : "requests",
    dailyLimitValue: hasSpend
      ? editKey.maxSpendUsdPerDay
      : hasReq ? editKey.maxRequestsPerDay : REQUEST_LIMIT_RANGE.min,
  };
}

export default function ApiKeyDrawer({ isOpen, onClose, editKey, onSaved, activeProviders = [] }) {
  const isEdit = !!editKey;
  const [form, setForm] = useState(() => buildForm(editKey));
  const { name, isRestricted, allowedModels, expiresAt,
          dailyLimitEnabled, dailyLimitMode, dailyLimitValue } = form;
  const setField = (patch) => setForm(f => ({ ...f, ...patch }));

  const [saving, setSaving] = useState(false);
  const [createdKey, setCreatedKey] = useState(null);
  const [showCreated, setShowCreated] = useState(false);
  const [error, setError] = useState(null);

  const openKey = isOpen ? (editKey?.id ?? "new") : null;
  const [prevOpenKey, setPrevOpenKey] = useState(openKey);
  if (prevOpenKey !== openKey) {
    setPrevOpenKey(openKey);
    if (openKey !== null) {
      setForm(buildForm(editKey));
      setError(null);
      setCreatedKey(null);
      setShowCreated(false);
    }
  }

  const handleSave = async () => {
    if (!name.trim()) { setError("Key name is required."); return; }
    if (isRestricted && allowedModels.length === 0) {
      setError("Add at least one model when restricting access."); return;
    }
    setError(null);
    setSaving(true);

    const body = {
      name: name.trim(),
      allowedModels: isRestricted ? allowedModels : [],
      blockedModels: [],
      ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      maxRequestsPerDay: dailyLimitEnabled && dailyLimitMode === "requests" ? dailyLimitValue : null,
      maxSpendUsdPerDay: dailyLimitEnabled && dailyLimitMode === "spend" ? dailyLimitValue : null,
    };

    try {
      if (isEdit) {
        const res = await fetch(`/api/keys/${editKey.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update key");
        const data = await res.json();
        onSaved(data.key, false);
      } else {
        const res = await fetch("/api/keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to create key");
        const data = await res.json();
        setCreatedKey(data.key);
        setShowCreated(true);
        onSaved(data, true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const copyCreated = () => {
    if (createdKey) navigator.clipboard.writeText(createdKey.key || createdKey);
  };

  const title = isEdit ? "Edit API Key" : "Create API Key";

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      width="lg"
    >
      <div className="flex flex-col gap-6">
        {/* Created key reveal */}
        {showCreated && createdKey ? (
          <div className="flex flex-col gap-3">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                Save this key now!
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                This is the only time you will see it. Store it securely.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={createdKey.key || ""}
                readOnly
                className="min-w-0 flex-1 font-mono text-sm"
              />
              <Button
                variant="secondary"
                icon="content_copy"
                onClick={copyCreated}
              >
                Copy
              </Button>
            </div>
            <Button onClick={handleClose} fullWidth>
              Done
            </Button>
          </div>
        ) : (
          <>
            {/* Key Name */}
            <Input
              label="Key Name"
              value={name}
              onChange={(e) => setField({ name: e.target.value })}
              placeholder="Production Key"
              hint="A label to identify this key"
              disabled={saving}
            />

            {/* Expiry */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-main">
                Expiry Date
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setField({ expiresAt: e.target.value })}
                disabled={saving}
                className="w-full rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-sm text-text-main outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 transition-shadow"
              />
              <p className="text-xs text-text-muted">Leave empty for no expiry</p>
            </div>

            {/* Model restrictions */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-main">Model Restrictions</p>
                  <p className="text-xs text-text-muted">
                    Restrict this key to specific models or providers
                  </p>
                </div>
                <Toggle
                  checked={isRestricted}
                onChange={(v) => {
                  setField({
                    isRestricted: v,
                    allowedModels: v ? allowedModels : []
                  });
                }}
                  size="sm"
                  disabled={saving}
                />
              </div>

              {isRestricted && (
                <div className="flex min-w-0 flex-col gap-3 pl-1 border-l-2 border-primary/20">
                  <ModelSelectSection
                    selected={allowedModels}
                    onRemove={(v) => setField({ allowedModels: allowedModels.filter(x => x !== v) })}
                    onAdd={(v) => setField({ allowedModels: v })}
                    onAddPattern={(v) => setField({ allowedModels: v })}
                    activeProviders={activeProviders}
                  />
                  <p className="text-xs text-text-muted -mt-1">
                    Yellow chips are wildcard patterns (e.g. <code>kr/*</code>).
                  </p>
                </div>
              )}
            </div>

            {/* Daily request/spend limits */}
            <DailyLimitSection
              enabled={dailyLimitEnabled}
              onToggle={(v) => {
                setField({
                  dailyLimitEnabled: v,
                  ...(v ? { dailyLimitValue: dailyLimitMode === "spend" ? SPEND_LIMIT_RANGE.min : REQUEST_LIMIT_RANGE.min } : {})
                });
              }}
              mode={dailyLimitMode}
              onModeChange={(m) => setField({ dailyLimitMode: m, dailyLimitValue: m === "spend" ? SPEND_LIMIT_RANGE.min : REQUEST_LIMIT_RANGE.min })}
              value={dailyLimitValue}
              onValueChange={(v) => setField({ dailyLimitValue: v })}
              disabled={saving}
            />

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-500">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-border sm:flex-row">
              <Button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                loading={saving}
                fullWidth
              >
                {isEdit ? "Save Changes" : "Create Key"}
              </Button>
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={saving}
                fullWidth
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}

ApiKeyDrawer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  editKey: PropTypes.object,
  onSaved: PropTypes.func.isRequired,
  activeProviders: PropTypes.array,
};
