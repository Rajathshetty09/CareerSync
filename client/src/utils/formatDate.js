export const formatDate = (date, options = {}) => {
  const defaultOptions = { year: 'numeric', month: 'short', day: 'numeric', ...options };
  return new Intl.DateTimeFormat('en-US', defaultOptions).format(new Date(date));
};

export const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  const intervals = [
    [31536000, 'year'], [2592000, 'month'], [86400, 'day'],
    [3600, 'hour'], [60, 'minute'],
  ];
  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
};
