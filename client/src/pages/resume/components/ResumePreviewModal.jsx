import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchResumeById, clearActiveResume } from '../../../features/resume/resumeSlice.js';
import Modal from '../../../components/ui/Modal.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Loader from '../../../components/common/Loader.jsx';
import { ExternalLink, FileText, Calendar, HardDrive } from 'lucide-react';
import { formatDate } from '../../../utils/formatDate.js';

const formatBytes = (b) => b ? `${(b / 1024 / 1024).toFixed(2)} MB` : '—';

const Tab = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-primary-600 text-primary-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    {children}
  </button>
);

const ResumePreviewModal = ({ resumeId, onClose }) => {
  const dispatch = useDispatch();
  const resume = useSelector((s) => s.resume.activeResume);
  const [tab, setTab] = useState('info');
  const isLoading = !resume || resume._id !== resumeId;

  useEffect(() => {
    if (resumeId) dispatch(fetchResumeById(resumeId));
    return () => dispatch(clearActiveResume());
  }, [resumeId, dispatch]);

  return (
    <Modal isOpen={!!resumeId} onClose={onClose} title="Resume Preview" size="lg">
      {isLoading ? (
        <Loader />
      ) : (
        <div className="space-y-4">
          {/* Meta */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
              <FileText size={20} className="text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{resume.fileName}</p>
              <div className="flex flex-wrap gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar size={11} />
                  {formatDate(resume.createdAt)}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <HardDrive size={11} />
                  {formatBytes(resume.fileSize)}
                </span>
              </div>
            </div>
            <a
              href={resume.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 shrink-0"
            >
              <ExternalLink size={14} />
              Open PDF
            </a>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 flex gap-1">
            <Tab active={tab === 'info'} onClick={() => setTab('info')}>Skills &amp; Info</Tab>
            <Tab active={tab === 'text'} onClick={() => setTab('text')}>Extracted Text</Tab>
          </div>

          {/* Tab: Info */}
          {tab === 'info' && (
            <div>
              {resume.extractedSkills?.length > 0 ? (
                <>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Extracted Skills ({resume.extractedSkills.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {resume.extractedSkills.map((s) => (
                      <Badge key={s}>{s}</Badge>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400 italic py-4 text-center">
                  No skills were automatically extracted from this resume.
                  <br />
                  AI-powered extraction will be available in a future update.
                </p>
              )}
            </div>
          )}

          {/* Tab: Extracted Text */}
          {tab === 'text' && (
            <div>
              {resume.extractedText ? (
                <pre className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-72 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
                  {resume.extractedText}
                </pre>
              ) : (
                <p className="text-sm text-gray-400 italic py-4 text-center">
                  No text could be extracted from this PDF.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ResumePreviewModal;
