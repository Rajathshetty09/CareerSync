import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchResumes } from '../../features/resume/resumeSlice.js';
import Loader from '../../components/common/Loader.jsx';
import ResumeUploadZone from './components/ResumeUploadZone.jsx';
import ResumeCard from './components/ResumeCard.jsx';
import ResumePreviewModal from './components/ResumePreviewModal.jsx';
import { FileText } from 'lucide-react';

const ResumeDashboard = () => {
  const dispatch = useDispatch();
  const { resumes, listStatus, error } = useSelector((s) => s.resume);
  const [previewId, setPreviewId] = useState(null);

  useEffect(() => {
    if (listStatus === 'idle') dispatch(fetchResumes());
  }, [dispatch, listStatus]);

  if (listStatus === 'loading') return <Loader fullPage />;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resumes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload up to 5 resumes. Skills are extracted automatically and used for AI job matching.
        </p>
      </div>

      {/* Upload zone */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Upload New Resume
        </h2>
        <ResumeUploadZone currentCount={resumes.length} />
      </section>

      {/* Resume list */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Your Resumes ({resumes.length})
        </h2>

        {error && (
          <p className="text-sm text-red-500 mb-3">{error}</p>
        )}

        {resumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <FileText size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No resumes yet</p>
            <p className="text-sm text-gray-400 mt-1">Upload a PDF above to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume._id}
                resume={resume}
                onPreview={(id) => setPreviewId(id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Preview modal */}
      {previewId && (
        <ResumePreviewModal
          resumeId={previewId}
          onClose={() => setPreviewId(null)}
        />
      )}
    </div>
  );
};

export default ResumeDashboard;
