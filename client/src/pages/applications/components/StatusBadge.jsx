const CONFIG = {
  pending:      { label: 'Pending',      className: 'bg-gray-100 text-gray-700' },
  applied:      { label: 'Applied',      className: 'bg-blue-100 text-blue-700' },
  interviewing: { label: 'Interviewing', className: 'bg-yellow-100 text-yellow-700' },
  offered:      { label: 'Offered',      className: 'bg-green-100 text-green-700' },
  rejected:     { label: 'Rejected',     className: 'bg-red-100 text-red-700' },
  withdrawn:    { label: 'Withdrawn',    className: 'bg-purple-100 text-purple-700' },
};

const StatusBadge = ({ status, size = 'sm' }) => {
  const { label, className } = CONFIG[status] || CONFIG.pending;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${className} ${sizeClass}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
