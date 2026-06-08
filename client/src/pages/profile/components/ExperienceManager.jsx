import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import {
  addExperience,
  updateExperience,
  deleteExperience,
  resetSaveStatus,
} from '../../../features/profile/profileSlice.js';
import { showToast } from '../../../features/ui/uiSlice.js';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import FormField from '../../../components/forms/FormField.jsx';
import { Pencil, Trash2, Plus, Briefcase } from 'lucide-react';
import { formatDate } from '../../../utils/formatDate.js';

// ─── Experience Form (used in add + edit modal) ───────────────────────────────
const ExperienceForm = ({ defaultValues, onSubmit, onCancel, isLoading }) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: defaultValues || { current: false } });

  const isCurrent = watch('current');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Company"
          placeholder="Acme Corp"
          error={errors.company}
          {...register('company', { required: 'Company is required' })}
        />
        <FormField
          label="Role / Title"
          placeholder="Software Engineer"
          error={errors.role}
          {...register('role', { required: 'Role is required' })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Start date"
          type="date"
          error={errors.from}
          {...register('from', { required: 'Start date is required' })}
        />
        <FormField
          label="End date"
          type="date"
          disabled={isCurrent}
          error={errors.to}
          {...register('to', {
            validate: (val) => {
              if (isCurrent) return true;
              if (!val) return 'End date is required';
              return true;
            },
          })}
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          {...register('current')}
        />
        <span className="text-sm text-gray-700">I currently work here</span>
      </label>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Key responsibilities, achievements…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          {...register('description', { maxLength: { value: 500, message: 'Max 500 characters' } })}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="flex gap-3 pt-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          {defaultValues ? 'Save changes' : 'Add experience'}
        </Button>
      </div>
    </form>
  );
};

// ─── Experience Card ──────────────────────────────────────────────────────────
const ExperienceCard = ({ exp, onEdit, onDelete }) => (
  <div className="flex gap-4 py-4 first:pt-0 last:pb-0 border-b border-gray-100 last:border-0">
    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
      <Briefcase size={18} className="text-primary-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 truncate">{exp.role}</p>
      <p className="text-sm text-gray-600">{exp.company}</p>
      <p className="text-xs text-gray-400 mt-0.5">
        {formatDate(exp.from, { year: 'numeric', month: 'short' })}
        {' — '}
        {exp.current ? 'Present' : exp.to ? formatDate(exp.to, { year: 'numeric', month: 'short' }) : ''}
      </p>
      {exp.description && (
        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{exp.description}</p>
      )}
    </div>
    <div className="flex gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onEdit(exp)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
        aria-label="Edit"
      >
        <Pencil size={15} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(exp._id)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        aria-label="Delete"
      >
        <Trash2 size={15} />
      </button>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ExperienceManager = () => {
  const dispatch = useDispatch();
  const { data: profile, saveStatus, saveError } = useSelector((s) => s.profile);

  const [modal, setModal] = useState({ open: false, editing: null });

  useEffect(() => {
    if (saveStatus === 'succeeded' && modal.open) {
      dispatch(showToast({
        message: modal.editing ? 'Experience updated' : 'Experience added',
        type: 'success',
      }));
      dispatch(resetSaveStatus());
      setModal({ open: false, editing: null });
    }
  }, [saveStatus, modal.editing, modal.open, dispatch]);

  const handleSubmit = (formData) => {
    if (modal.editing) {
      dispatch(updateExperience({ expId: modal.editing._id, expData: formData }));
    } else {
      dispatch(addExperience(formData));
    }
  };

  const handleDelete = (expId) => {
    if (window.confirm('Remove this experience?')) {
      dispatch(deleteExperience(expId)).then((res) => {
        if (deleteExperience.fulfilled.match(res)) {
          dispatch(showToast({ message: 'Experience removed', type: 'success' }));
        }
      });
    }
  };

  const isSaving = saveStatus === 'loading';
  const experience = profile?.experience || [];

  return (
    <>
      <Card>
        <Card.Header className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Work Experience</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Add your work history — newest entries appear first.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setModal({ open: true, editing: null })}
          >
            <Plus size={15} />
            Add
          </Button>
        </Card.Header>

        <Card.Body>
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {saveError}
            </div>
          )}

          {experience.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {experience.map((exp) => (
                <ExperienceCard
                  key={exp._id}
                  exp={exp}
                  onEdit={(e) => setModal({ open: true, editing: e })}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Briefcase size={36} className="text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No experience added yet</p>
              <button
                type="button"
                onClick={() => setModal({ open: true, editing: null })}
                className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                + Add your first role
              </button>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? 'Edit Experience' : 'Add Experience'}
        size="md"
      >
        <ExperienceForm
          defaultValues={modal.editing}
          onSubmit={handleSubmit}
          onCancel={() => setModal({ open: false, editing: null })}
          isLoading={isSaving}
        />
      </Modal>
    </>
  );
};

export default ExperienceManager;
