interface IconProps {
  size?: number;
}

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
}

export function PencilIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function TrashIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

export function FolderIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2Z" />
    </svg>
  );
}

export function LockIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function LockPlusIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="4" y="11" width="12" height="10" rx="2" />
      <path d="M6.5 11V7.5a3.5 3.5 0 0 1 7 0V11" />
      <path d="M19 4v5" />
      <path d="M16.5 6.5h5" />
    </svg>
  );
}

export function KeyIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}

export function KeyPlusIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="7" cy="16" r="4.5" />
      <path d="m10.2 12.8 5-5" />
      <path d="m13 10 2 2" />
      <path d="M18.5 3v5" />
      <path d="M16 5.5h5" />
    </svg>
  );
}

export function FolderPlusIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2Z" />
      <path d="M12 11v6" />
      <path d="M9 14h6" />
    </svg>
  );
}

export function LogoutIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
