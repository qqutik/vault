import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Modal from './Modal';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PromptOptions {
  title: string;
  message?: string;
  placeholder?: string;
  confirmLabel?: string;
  initialValue?: string;
}

interface DialogApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

type Active =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (v: string | null) => void };

const DialogContext = createContext<DialogApi | null>(null);

/** Imperative, promise-based confirm/prompt dialogs rendered as styled modals. */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Active | null>(null);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setActive({ kind: 'confirm', options, resolve })),
    [],
  );

  const prompt = useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setValue(options.initialValue ?? '');
        setActive({ kind: 'prompt', options, resolve });
      }),
    [],
  );

  const settle = useCallback((result: boolean | string | null) => {
    setActive((current) => {
      current?.resolve(result as never);
      return null;
    });
  }, []);

  const cancel = useCallback(() => {
    settle(active?.kind === 'prompt' ? null : false);
  }, [active, settle]);

  useEffect(() => {
    if (active?.kind === 'prompt') inputRef.current?.focus();
  }, [active]);

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') cancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, cancel]);

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      {active && (
        <Modal title={active.options.title} onClose={cancel}>
          {active.options.message && <p className="muted dialog-message">{active.options.message}</p>}

          {active.kind === 'prompt' && (
            <input
              ref={inputRef}
              className="dialog-input"
              value={value}
              placeholder={active.options.placeholder}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') settle(value);
              }}
            />
          )}

          <div className="dialog-actions">
            <button type="button" className="small secondary" onClick={cancel}>
              {active.kind === 'confirm' ? (active.options.cancelLabel ?? 'Cancel') : 'Cancel'}
            </button>
            <button
              type="button"
              className={`small${active.kind === 'confirm' && active.options.danger ? ' danger' : ''}`}
              onClick={() => settle(active.kind === 'prompt' ? value : true)}
            >
              {active.options.confirmLabel ?? (active.kind === 'confirm' ? 'Confirm' : 'OK')}
            </button>
          </div>
        </Modal>
      )}
    </DialogContext.Provider>
  );
}

/** Access the imperative confirm/prompt dialogs. */
export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within a DialogProvider');
  return ctx;
}
