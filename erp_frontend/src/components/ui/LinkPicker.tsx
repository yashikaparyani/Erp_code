'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type LookupEntity = 'project' | 'site' | 'item' | 'customer' | 'warehouse' | 'vendor' | 'invoice' | 'commercial_reference' | 'purchase_order' | 'tender' | 'employee';

interface LinkPickerProps {
  entity: LookupEntity;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Extra filters passed to the lookup, e.g. { project: 'PROJ-001' } */
  filters?: Record<string, string>;
}

interface Option {
  value: string;
  label: string;
  sub?: string;
}

/**
 * Searchable picker that fetches matching records from /api/lookup.
 * Debounces input, shows dropdown, allows keyboard navigation.
 */
export default function LinkPicker({ entity, value, onChange, placeholder, className = '', disabled, filters }: LinkPickerProps) {
  const [query, setQuery] = useState(value || '');
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync external value changes
  useEffect(() => { setQuery(value || ''); }, [value]);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ entity, q });
      if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await fetch(`/api/lookup?${params}`);
      const payload = await res.json();
      if (payload.success !== false) setOptions(payload.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [entity, filters]);

  const handleInput = (text: string) => {
    setQuery(text);
    onChange(text); // allow free-text fallback
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length >= 1) {
      debounceRef.current = setTimeout(() => { search(text); setOpen(true); }, 250);
    } else {
      setOptions([]);
      setOpen(false);
    }
  };

  const pick = (opt: Option) => {
    setQuery(opt.value);
    onChange(opt.value);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !options.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && highlighted >= 0) { e.preventDefault(); pick(options[highlighted]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        className={`input ${className}`}
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => { if (options.length) setOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {loading && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">…</span>}
      {open && options.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm">
          {options.map((opt, i) => (
            <li
              key={opt.value}
              className={`px-3 py-2 cursor-pointer ${i === highlighted ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50'}`}
              onMouseDown={() => pick(opt)}
              onMouseEnter={() => setHighlighted(i)}
            >
              <div className="font-medium">{opt.label}</div>
              {opt.sub && <div className="text-xs text-gray-500">{opt.sub}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
