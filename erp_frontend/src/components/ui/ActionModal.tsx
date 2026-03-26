'use client';

import { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAccessibleOverlay } from '@/lib/useAccessibleOverlay';

export type ActionModalField = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'file';
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: { value: string; label: string }[];
};

type ActionModalProps = {
  open: boolean;
  title: string;
  description?: string;
  variant?: 'default' | 'danger' | 'success';
  fields?: ActionModalField[];
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: (values: Record<string, string>) => void | Promise<void>;
  onCancel: () => void;
  children?: ReactNode;
};

const VARIANT_STYLES = {
  default: 'bg-blue-600 hover:bg-blue-700 text-white',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
} as const;

export default function ActionModal({
  open,
  title,
  description,
  variant = 'default',
  fields = [],
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
  children,
}: ActionModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { containerRef } = useAccessibleOverlay({
    isOpen: open,
    onClose: onCancel,
    initialFocusRef: closeRef,
  });

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const defaults: Record<string, string> = {};
      for (const f of fields) {
        if (f.defaultValue) defaults[f.name] = f.defaultValue;
      }
      setValues(defaults);
    }
  }, [open, fields]);

  const setValue = (name: string, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = () => {
    for (const field of fields) {
      if (field.required && !values[field.name]?.trim()) return;
    }
    onConfirm(values);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onCancel}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 id={titleId} className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {description && <p className="text-sm text-gray-600">{description}</p>}
          {children}
          {fields.map((field) => (
            <div key={field.name}>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {field.label} {field.required && <span className="text-rose-500">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={values[field.name] || ''}
                  onChange={(e) => setValue(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : field.type === 'select' ? (
                <select
                  value={values[field.name] || ''}
                  onChange={(e) => setValue(field.name, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={values[field.name] || ''}
                  onChange={(e) => setValue(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-50 ${VARIANT_STYLES[variant]}`}
          >
            {busy ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
