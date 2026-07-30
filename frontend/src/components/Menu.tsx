import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface Props {
  /** Content of the trigger button (an icon). */
  trigger: ReactNode;
  /** Accessible label for the trigger. */
  label: string;
  items: MenuItem[];
  /** Which edge the menu aligns to. Defaults to right. */
  align?: 'left' | 'right';
  /** Extra class(es) for the trigger button. */
  triggerClassName?: string;
}

/**
 * A small popover of action buttons opened from an icon trigger. Closes on
 * outside click, Escape, or after an item is chosen.
 */
export default function Menu({
  trigger,
  label,
  items,
  align = 'right',
  triggerClassName = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`menu${open ? ' open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`icon-btn menu-trigger ${triggerClassName}`.trim()}
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={label}
      >
        {trigger}
      </button>

      {open && (
        <ul className={`menu-list menu-${align}`} id={menuId} role="menu">
          {items.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                role="menuitem"
                className={`menu-option${item.danger ? ' danger' : ''}`}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.icon && <span className="menu-icon">{item.icon}</span>}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
