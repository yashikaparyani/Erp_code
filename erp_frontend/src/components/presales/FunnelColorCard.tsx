'use client';
import React from 'react';
import { FunnelColorKey, FunnelDisplayMeta, PresalesColorConfig, getFunnelDisplayMeta } from '../tenderFunnel';
import { TrendingUp } from 'lucide-react';

interface FunnelColorCardProps {
  colorKey: FunnelColorKey;
  count: number;
  value: number;
  isActive?: boolean;
  onClick?: () => void;
  colorConfig?: PresalesColorConfig;
}

function formatCrore(value: number): string {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
  if (value > 0) return `₹${value.toLocaleString('en-IN')}`;
  return '₹0';
}

export default function FunnelColorCard({
  colorKey,
  count,
  value,
  isActive = false,
  onClick,
  colorConfig,
}: FunnelColorCardProps) {
  const meta: FunnelDisplayMeta = getFunnelDisplayMeta(colorKey, colorConfig);

  const isUserSlot = colorKey.startsWith('USER_SLOT_');
  if (isUserSlot && count === 0 && !colorConfig) return null;

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col gap-2 rounded-2xl border-2 p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
      style={{
        borderColor: isActive ? meta.hex : `${meta.hex}40`,
        backgroundColor: isActive ? `${meta.hex}18` : `${meta.hex}08`,
        boxShadow: isActive ? `0 0 0 2px ${meta.hex}60` : undefined,
      }}
    >
      {/* Color stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: meta.hex }}
      />

      {/* Header */}
      <div className="flex items-center justify-between ml-2">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md"
          style={{ backgroundColor: meta.hex }}
        >
          {isUserSlot ? meta.label.charAt(0).toUpperCase() : count}
        </div>
        {!isUserSlot && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${meta.hex}20`, color: meta.hex }}
          >
            {meta.key}
          </span>
        )}
      </div>

      {/* Label */}
      <div className="ml-2">
        <p className="text-xs font-semibold truncate" style={{ color: meta.hex }}>
          {meta.label}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{meta.description || 'Click to filter'}</p>
      </div>

      {/* Stats */}
      <div className="ml-2 flex items-center gap-3 mt-1">
        <span className="text-2xl font-bold" style={{ color: meta.hex }}>
          {count}
        </span>
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400">tenders</span>
          <span className="text-xs font-semibold text-gray-600">{formatCrore(value)}</span>
        </div>
        <TrendingUp className="ml-auto w-4 h-4 opacity-30" style={{ color: meta.hex }} />
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-2 right-2 h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: meta.hex }} />
      )}
    </button>
  );
}
