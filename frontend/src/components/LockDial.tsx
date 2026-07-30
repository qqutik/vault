import { useEffect, useState } from 'react';

interface Props {
  value: number;
  label: string;
  active?: boolean;
  onClick: () => void;
}

/**
 * A combination-lock style stat dial: the value sits in a read window with its
 * faint neighbours above/below, and rolls up to its value on mount (skipped for
 * users who prefer reduced motion).
 */
export default function LockDial({ value, label, active = false, onClick }: Props) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || value <= 0) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const duration = 550;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setDisplay(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <button
      type="button"
      className={`lock-dial${active ? ' active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="lock-wheel" aria-hidden="true">
        <span className="lock-ghost">{display > 0 ? display - 1 : ' '}</span>
        <span className="lock-main">{display}</span>
        <span className="lock-ghost">{display + 1}</span>
      </span>
      <span className="lock-dial-label">{label}</span>
    </button>
  );
}
