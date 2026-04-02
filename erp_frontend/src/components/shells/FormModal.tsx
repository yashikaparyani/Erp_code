'use client';

import { ReactNode, RefObject, useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAccessibleOverlay } from '@/lib/useAccessibleOverlay';

// ── Types ──────────────────────────────────────────────────────────────────

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'file';
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: { value: string; label: string }[];
  /** Optional hint text shown below the input. */
  hint?: string;
  /** If true, the field is disabled. */
  disabled?: boolean;
}

export interface FormModalProps {
  open: boolean;
  /** Modal title — e.g. "Create Survey", "Edit Purchase Order". */
  title: string;
  description?: string;
  /** Size of the modal. */
  size?: 'sm' | 'md' | 'lg';

  // ── fields ──
  fields?: FormField[];

  // ── actions ──
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger' | 'success';
  busy?: boolean;
  onConfirm: (values: Record<string, string>) => void | Promise<void>;
  onCancel: () => void;

  /** Render-prop children for fully custom form content. When provided, fields are ignored. */
  children?: ReactNode;
}

// ── Variant styles ─────────────────────────────────────────────────────────

const BTN_VARIANT: Record<string, string> = {
  default: 'bg-[var(--accent)] hover:bg-[var(--accent-strong)] text-white',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
};

const SIZE_WIDTH: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

// ── Component ──────────────────────────────────────────────────────────────

export default function FormModal({
  open,
  title,
  description,
  size = 'md',
  fields = [],
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  variant = 'default',
  busy = false,
  onConfirm,
  onCancel,
  children,
}: FormModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLElement | null>(null);
  const initialFocusRef = (
    fields.length ? firstFieldRef : closeRef
  ) as unknown as RefObject<HTMLElement>;
  const { containerRef } = useAccessibleOverlay({
    isOpen: open,
    onClose: onCancel,
    initialFocusRef,
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  // Reset form state when modal opens
  useEffect(() => {
    if (open) {
      const defaults: Record<string, string> = {};
      for (const f of fields) {
        if (f.defaultValue) defaults[f.name] = f.defaultValue;
      }
      setValues(defaults);
      setFieldErrors({});
    }
  }, [open, fields]);

  const setValue = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: false }));
  };

  const bindFirstField = (index: number) => (el: HTMLElement | null) => {
    if (index === 0) firstFieldRef.current = el;
  };

  const handleSubmit = () => {
    // Validate required fields
    const errors: Record<string, boolean> = {};
    let hasError = false;
    for (const field of fields) {
      if (field.required && !values[field.name]?.trim()) {
        errors[field.name] = true;
        hasError = true;
      }
    }
    if (hasError) {
      setFieldErrors(errors);
      return;
    }
    onConfirm(values);
  };

  if (!open) return null;

  const inputCls = (name: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
      fieldErrors[name]
        ? 'border-rose-400 bg-rose-50'
        : 'border-gray-300 bg-white'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onCancel}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full ${SIZE_WIDTH[size]} overflow-hidden rounded-2xl bg-white shadow-2xl focus:outline-none`}
      >
        {/* ── Header ── */}
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

        {/* ── Body ── */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-4">
          {description && <p className="text-sm text-gray-600">{description}</p>}

          {children
            ? children
            : fields.map((field, index) => (
                <div key={field.name}>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-rose-500"> *</span>}
                  </label>

                  {field.type === 'textarea' ? (
                    <textarea
                      ref={bindFirstField(index)}
                      value={values[field.name] ?? ''}
                      onChange={(e) => setValue(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      disabled={field.disabled}
                      rows={3}
                      className={inputCls(field.name)}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      ref={bindFirstField(index)}
                      value={values[field.name] ?? ''}
                      onChange={(e) => setValue(field.name, e.target.value)}
                      disabled={field.disabled}
                      className={inputCls(field.name)}
                    >
                      <option value="">{field.placeholder ?? 'Select\u2026'}</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'date' ? (
                    <input
                      ref={bindFirstField(index)}
                      type="date"
                      value={values[field.name] ?? ''}
                      onChange={(e) => setValue(field.name, e.target.value)}
                      disabled={field.disabled}
                      className={inputCls(field.name)}
                    />
                  ) : field.type === 'number' ? (
                    <input
                      ref={bindFirstField(index)}
                      type="number"
                      value={values[field.name] ?? ''}
                      onChange={(e) => setValue(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      disabled={field.disabled}
                      className={inputCls(field.name)}
                    />
                  ) : (
                    <input
                      ref={bindFirstField(index)}
                      type="text"
                      value={values[field.name] ?? ''}
                      onChange={(e) => setValue(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      disabled={field.disabled}
                      className={inputCls(field.name)}
                    />
                  )}

                  {field.hint && (
                    <p className="mt-1 text-xs text-gray-400">{field.hint}</p>
                  )}
                  {fieldErrors[field.name] && (
                    <p className="mt-1 text-xs text-rose-500">This field is required.</p>
                  )}
                </div>
              ))}
        </div>

        {/* ── Footer ── */}
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
            className={`rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-50 ${BTN_VARIANT[variant]}`}
          >
            {busy ? 'Processing\u2026' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
