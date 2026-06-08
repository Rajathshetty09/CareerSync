import { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { addResume } from '../../../features/resume/resumeSlice.js';
import { showToast } from '../../../features/ui/uiSlice.js';
import { uploadResume } from '../../../api/resumeApi.js';
import ProgressBar from '../../../components/ui/ProgressBar.jsx';
import { UploadCloud, FileText, X } from 'lucide-react';

const MAX_SIZE_MB = 10;
const MAX_RESUMES = 5;

const ResumeUploadZone = ({ currentCount }) => {
  const dispatch = useDispatch();
  const inputRef = useRef(null);

  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');

  const atLimit = currentCount >= MAX_RESUMES;

  const validate = (file) => {
    if (file.type !== 'application/pdf') return 'Only PDF files are accepted.';
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `File must be under ${MAX_SIZE_MB} MB.`;
    return null;
  };

  const handleFile = (file) => {
    if (!file) return;
    const err = validate(file);
    if (err) { setError(err); return; }
    setError('');
    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('resume', selectedFile);

    setUploading(true);
    setProgress(0);
    try {
      const { data } = await uploadResume(formData, setProgress);
      dispatch(addResume(data.data));
      dispatch(showToast({ message: 'Resume uploaded successfully', type: 'success' }));
      setSelectedFile(null);
      setProgress(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (atLimit) {
    return (
      <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
        <FileText size={16} className="shrink-0" />
        <span>You have reached the maximum of {MAX_RESUMES} resumes. Delete one to upload a new version.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !selectedFile && inputRef.current?.click()}
        className={[
          'relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-colors',
          dragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-gray-50/50',
          !selectedFile ? 'cursor-pointer hover:border-primary-400 hover:bg-primary-50/30' : '',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {selectedFile ? (
          <div className="flex items-center gap-3 w-full max-w-sm">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
              <FileText size={20} className="text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setError(''); }}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              aria-label="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <UploadCloud size={24} className="text-primary-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                Drag & drop your resume, or{' '}
                <span className="text-primary-600">browse</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF only · Max {MAX_SIZE_MB} MB · {currentCount}/{MAX_RESUMES} used</p>
            </div>
          </>
        )}
      </div>

      {/* Progress */}
      {uploading && <ProgressBar value={progress} label="Uploading and extracting skills…" />}

      {/* Error */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Upload button */}
      {selectedFile && !uploading && (
        <button
          type="button"
          onClick={handleUpload}
          className="w-full py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          Upload Resume
        </button>
      )}
    </div>
  );
};

export default ResumeUploadZone;
