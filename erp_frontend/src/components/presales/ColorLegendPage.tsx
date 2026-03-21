'use client';
import React, { useState } from 'react';
import { Lock, Edit3, Save, X, Palette, Info } from 'lucide-react';
import {
  SYSTEM_FUNNEL_META,
  SystemFunnelKey,
  UserSlotKey,
  USER_SLOT_DEFAULTS,
  COLOR_PALETTE,
  PresalesColorConfig,
} from '../tenderFunnel';

interface Props {
  colorConfig?: PresalesColorConfig;
  onUpdateSlot: (slot: number, color: string, label: string, description: string) => Promise<void>;
}

function SystemColorRow({ colorKey }: { colorKey: SystemFunnelKey }) {
  const meta = SYSTEM_FUNNEL_META[colorKey];
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-[var(--border-subtle)] bg-white/60">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl border-2 flex items-center justify-center" style={{ backgroundColor: `${meta.hex}20`, borderColor: meta.hex }}>
        <span className="text-base" style={{ color: meta.hex }}>●</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text-main)]">{meta.label}</span>
          <Lock className="w-3 h-3 text-[var(--text-soft)]" aria-label="System fixed color" />
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{meta.description}</p>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.hex }} />
          <span className="text-[10px] font-mono text-[var(--text-soft)]">{meta.hex}</span>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{colorKey}</span>
        </div>
      </div>
    </div>
  );
}


interface UserSlotRowProps {
  slotIndex: number;
  config?: { color: string; label: string; description: string; hex: string; count?: number };
  onSave: (color: string, label: string, description: string) => Promise<void>;
}

function UserSlotRow({ slotIndex, config, onSave }: UserSlotRowProps) {
  const slotKey = `USER_SLOT_${slotIndex}` as UserSlotKey;
  const defaults = USER_SLOT_DEFAULTS[slotKey];
  const currentColor = config?.color ?? defaults.color;
  const currentHex = config?.hex ?? defaults.hex;
  const currentLabel = config?.label ?? defaults.label;
  const currentDesc = config?.description ?? '';

  const [editing, setEditing] = useState(false);
  const [color, setColor] = useState(currentColor);
  const [label, setLabel] = useState(currentLabel);
  const [desc, setDesc] = useState(currentDesc);
  const [saving, setSaving] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  const selectedHex = COLOR_PALETTE.find((c) => c.name === color)?.hex ?? currentHex;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(color, label, desc);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border-2 bg-white/60 transition-all ${editing ? 'shadow-md' : ''}`}
      style={{ borderColor: editing ? selectedHex : `${selectedHex}40` }}>
      {/* Color preview */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm cursor-pointer hover:scale-105 transition-transform relative"
        style={{ backgroundColor: selectedHex }}
        onClick={() => editing && setShowPalette(!showPalette)}
      >
        {slotIndex}
        {editing && <Palette className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full text-gray-600 p-0.5" />}
        {/* Palette picker */}
        {editing && showPalette && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-[var(--border-subtle)] p-2 w-48">
            <div className="grid grid-cols-5 gap-1.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.name}
                  title={c.name}
                  onClick={(e) => { e.stopPropagation(); setColor(c.name); setShowPalette(false); }}
                  className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${color === c.name ? 'border-white shadow-md scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Color label (e.g. Priority Tender)"
              className="w-full text-sm font-semibold rounded-lg border border-[var(--border-subtle)] px-2 py-1 focus:outline-none focus:border-[var(--accent)]"
            />
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Description (what this color means)"
              className="w-full text-xs rounded-lg border border-[var(--border-subtle)] px-2 py-1 focus:outline-none focus:border-[var(--accent)]"
            />
            <div className="text-[10px] text-[var(--text-soft)]">
              Click the color swatch above to choose a color from the palette
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--text-main)]">{label}</span>
              {config?.count !== undefined && config.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: selectedHex }}>
                  {config.count} tenders
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc || 'No description set'}</p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedHex }} />
              <span className="text-[10px] font-mono text-[var(--text-soft)]">{selectedHex}</span>
              <span className="text-[10px] text-[var(--text-soft)]">{color}</span>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex gap-1">
        {editing ? (
          <>
            <button onClick={handleSave} disabled={saving}
              className="p-1.5 rounded-lg text-white transition-all hover:opacity-90" style={{ backgroundColor: selectedHex }}>
              {saving ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin inline-block" /> : <Save className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => { setEditing(false); setColor(currentColor); setLabel(currentLabel); setDesc(currentDesc); }}
              className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg bg-white border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function ColorLegendPage({ colorConfig, onUpdateSlot }: Props) {
  const systemKeys = Object.keys(SYSTEM_FUNNEL_META) as SystemFunnelKey[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-200">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-blue-800">12-Color Funnel System</h3>
          <p className="text-xs text-blue-600 mt-1">
            <strong>6 System colors</strong> represent fixed lifecycle stages and cannot be changed.
            <br />
            <strong>6 Custom slots</strong> can be assigned any color and label — tenders tagged with a custom slot will display in your chosen color.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Colors */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[var(--text-soft)]" />
            <h3 className="text-sm font-bold text-[var(--text-main)]">System Colors</h3>
            <span className="text-xs text-[var(--text-soft)] bg-gray-100 px-2 py-0.5 rounded-full">Fixed — Lifecycle-driven</span>
          </div>
          <div className="space-y-2">
            {systemKeys.map((key) => (
              <SystemColorRow key={key} colorKey={key} />
            ))}
          </div>
        </div>

        {/* User Slots */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[var(--text-soft)]" />
            <h3 className="text-sm font-bold text-[var(--text-main)]">Custom Color Slots</h3>
            <span className="text-xs text-[var(--text-soft)] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">User-customizable</span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Click <Edit3 className="w-3 h-3 inline" /> to rename a slot, change its color, and add a description. Changes apply instantly to all tagged tenders.
          </p>
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => i + 1).map((i) => (
              <UserSlotRow
                key={i}
                slotIndex={i}
                config={colorConfig?.[`slot_${i}`]}
                onSave={(color, label, desc) => onUpdateSlot(i, color, label, desc)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Color Palette Reference */}
      <div className="p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)]">
        <h4 className="text-xs font-semibold text-[var(--text-main)] mb-3 flex items-center gap-2">
          <Palette className="w-4 h-4" /> Available Color Palette (20 colors)
        </h4>
        <div className="flex flex-wrap gap-2">
          {COLOR_PALETTE.map((c) => (
            <div key={c.name} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-[var(--border-subtle)]">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.hex }} />
              <span className="text-[10px] text-[var(--text-soft)]">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
