'use client';

import { ReactNode, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useAccessibleOverlay } from '@/lib/useAccessibleOverlay';

type ModalFrameProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
};

export default function ModalFrame({
  open,
  title,
  onClose,
  children,
  footer,
  widthClassName = 'max-w-2xl',
}: ModalFrameProps) {
  if (!open) return null;

  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { containerRef } = useAccessibleOverlay({
    isOpen: open,
    onClose,
    initialFocusRef: closeButtonRef,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        className={`w-full ${widthClassName} overflow-hidden rounded-3xl bg-white shadow-2xl focus:outline-none`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={`Close ${title}`}
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
