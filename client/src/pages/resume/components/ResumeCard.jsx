import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { deleteResume, setDefaultResume } from '../../../features/resume/resumeSlice.js';
import { showToast } from '../../../features/ui/uiSlice.js';
import Badge from '../../../components/ui/Badge.jsx';
import { FileText, Trash2, Star, Eye, ExternalLink } from 'lucide-react';
import { formatDate } from '../../../utils/formatDate.js';

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const ResumeCard = ({ resume, onPreview }) => {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${resume.fileName}"? This cannot be undone.`)) return;
    setBusy(true);
    const res = await dispatch(deleteResume(resume._id));
    if (deleteResume.fulfilled.match(res)) {
      dispatch(showToast({ message: 'Resume deleted', type: 'success' }));
    } else {
      dispatch(showToast({ message: res.payload || 'Delete failed', type: 'error' }));
    }
    setBusy(false);
  };

  const handleSetDefault = async () => {
    if (resume.isDefault) return;
    setBusy(true);
    const res = await dispatch(setDefaultResume(resume._id));
    if (setDefaultResume.fulfilled.match(res)) {
      dispatch(showToast({ message: 'Default resume updated', type: 'success' }));
    }
    setBusy(false);
  };

  const visibleSkills = resume.extractedSkills?.slice(0, 6) || [];
  const extraSkills = (resume.extractedSkills?.length || 0) - visibleSkills.length;

  return (
    <div className={`bg-white rounded-xl border transition-shadow hover:shadow-md ${resume.isDefault ? 'border-primary-300 ring-1 ring-primary-200' : 'border-gray-200'}`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
            <FileText size={20} className="text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900 truncate">{resume.fileName}</p>
              {resume.isDefault && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                  <Star size={10} className="fill-primary-600" />
                  Default
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDate(resume.createdAt)} · {formatBytes(resume.fileSize)}
            </p>
          </div>
        </div>

        {/* Skills */}
        {visibleSkills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleSkills.map((s) => (
              <Badge key={s} variant="gray">{s}</Badge>
            ))}
            {extraSkills > 0 && (
              <Badge variant="gray">+{extraSkills} more</Badge>
            )}
          </div>
        )}

        {!resume.extractedSkills?.length && (
          <p className="mt-3 text-xs text-gray-400 italic">No skills extracted</p>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPreview(resume._id)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-primary-600 transition-colors"
        >
          <Eye size={14} />
          Preview
        </button>

        <a
          href={resume.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-primary-600 transition-colors"
        >
          <ExternalLink size={14} />
          Open PDF
        </a>

        <div className="ml-auto flex items-center gap-2">
          {!resume.isDefault && (
            <button
              type="button"
              disabled={busy}
              onClick={handleSetDefault}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary-600 disabled:opacity-50 transition-colors"
            >
              <Star size={14} />
              Set default
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeCard;
