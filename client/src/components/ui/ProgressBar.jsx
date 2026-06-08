/**
 * Horizontal progress bar.
 * value: 0–100
 */
const ProgressBar = ({ value = 0, label, className = '' }) => (
  <div className={`w-full ${className}`}>
    {label && (
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
    )}
    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full bg-primary-600 rounded-full transition-all duration-200 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  </div>
);

export default ProgressBar;
