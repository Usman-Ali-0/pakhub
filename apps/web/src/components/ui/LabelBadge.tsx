'use client';

interface LabelBadgeProps {
  name: string;
  color: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
  removable?: boolean;
  onRemove?: () => void;
}

function getContrastColor(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1e293b' : '#ffffff';
}

export function LabelBadge({ name, color, size = 'sm', onClick, removable, onRemove }: LabelBadgeProps) {
  const bg = color.startsWith('#') ? color : `#${color}`;
  const textColor = getContrastColor(bg);

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      } ${onClick ? 'cursor-pointer hover:opacity-80' : ''} transition-opacity`}
      style={{ backgroundColor: bg, color: textColor, border: `1px solid ${bg}` }}
    >
      {name}
      {removable && onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="ml-0.5 hover:opacity-60">
          ×
        </button>
      )}
    </span>
  );
}
