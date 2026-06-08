import { X } from 'lucide-react';

const variants = {
  default: 'bg-primary-100 text-primary-700',
  green:   'bg-green-100 text-green-700',
  yellow:  'bg-yellow-100 text-yellow-700',
  red:     'bg-red-100 text-red-700',
  gray:    'bg-gray-100 text-gray-700',
};

const Badge = ({ children, variant = 'default', onRemove, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
  >
    {children}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full hover:bg-black/10 p-0.5 transition-colors"
        aria-label="Remove"
      >
        <X size={10} />
      </button>
    )}
  </span>
);

export default Badge;
