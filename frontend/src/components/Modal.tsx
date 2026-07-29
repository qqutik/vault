import type { ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  headerRight?: ReactNode;
  /** Render only the close button in the header (title is provided by children). */
  bareHeader?: boolean;
  children: ReactNode;
}

export default function Modal({ title, onClose, headerRight, bareHeader, children }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`modal-header${bareHeader ? ' bare' : ''}`}>
          {!bareHeader && <h2>{title}</h2>}
          {!bareHeader && headerRight && <span className="modal-header-extra">{headerRight}</span>}
          <button className="icon-btn" onClick={onClose} title="Close" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
