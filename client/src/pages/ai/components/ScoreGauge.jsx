const getColor = (score) => {
  if (score >= 75) return { track: 'text-green-500', label: 'text-green-700', bg: 'bg-green-50' };
  if (score >= 50) return { track: 'text-yellow-500', label: 'text-yellow-700', bg: 'bg-yellow-50' };
  return { track: 'text-red-500', label: 'text-red-700', bg: 'bg-red-50' };
};

const RECOMMENDATION_LABELS = {
  strong_apply: { text: 'Strong Match — Apply Now', className: 'bg-green-100 text-green-700' },
  apply:        { text: 'Good Match — Apply',        className: 'bg-blue-100 text-blue-700' },
  consider:     { text: 'Partial Match — Consider',  className: 'bg-yellow-100 text-yellow-700' },
  skip:         { text: 'Weak Match',                className: 'bg-red-100 text-red-700' },
};

const ScoreGauge = ({ score, recommendation }) => {
  const { track, label, bg } = getColor(score);
  const circumference = 2 * Math.PI * 54; // r=54
  const offset = circumference - (score / 100) * circumference;
  const rec = RECOMMENDATION_LABELS[recommendation] || RECOMMENDATION_LABELS.consider;

  return (
    <div className={`flex flex-col items-center gap-3 p-6 rounded-2xl ${bg}`}>
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${track} transition-all duration-700`}
            style={{ stroke: 'currentColor' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${label}`}>{score}</span>
          <span className="text-xs text-gray-500 font-medium">/ 100</span>
        </div>
      </div>
      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${rec.className}`}>
        {rec.text}
      </span>
    </div>
  );
};

export default ScoreGauge;
