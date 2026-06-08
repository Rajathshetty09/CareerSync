import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { updatePreferences, resetSaveStatus } from '../../../features/profile/profileSlice.js';
import { showToast } from '../../../features/ui/uiSlice.js';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { EMPLOYMENT_TYPES } from '../../../utils/constants.js';

const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center justify-between py-2 cursor-pointer select-none">
    <span className="text-sm text-gray-700">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
        checked ? 'bg-primary-600' : 'bg-gray-200',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  </label>
);

const PreferencesForm = () => {
  const dispatch = useDispatch();
  const { data: profile, saveStatus, saveError } = useSelector((s) => s.profile);

  const { register, handleSubmit, control, reset, formState: { isDirty } } = useForm();

  useEffect(() => {
    if (profile?.preferences) {
      const p = profile.preferences;
      reset({
        jobTypes:    p.jobTypes || [],
        salaryMin:   p.salaryMin || 0,
        remote:      p.remote || false,
        notif_email: p.notifications?.email ?? true,
        notif_jobs:  p.notifications?.jobAlerts ?? true,
        notif_apps:  p.notifications?.applicationUpdates ?? true,
      });
    }
  }, [profile, reset]);

  useEffect(() => {
    if (saveStatus === 'succeeded') {
      dispatch(showToast({ message: 'Preferences saved', type: 'success' }));
      dispatch(resetSaveStatus());
    }
  }, [saveStatus, dispatch]);

  const onSubmit = (data) => {
    dispatch(updatePreferences({
      jobTypes:  data.jobTypes,
      salaryMin: Number(data.salaryMin),
      remote:    data.remote,
      notifications: {
        email:              data.notif_email,
        jobAlerts:          data.notif_jobs,
        applicationUpdates: data.notif_apps,
      },
    }));
  };

  const isSaving = saveStatus === 'loading';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Job Types */}
      <Card>
        <Card.Header>
          <h3 className="font-medium text-gray-900">Job Preferences</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Used to filter and rank job recommendations.
          </p>
        </Card.Header>
        <Card.Body className="space-y-5">
          {saveError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {saveError}
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Employment types</p>
            <div className="flex flex-wrap gap-3">
              {EMPLOYMENT_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    value={type}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    {...register('jobTypes')}
                  />
                  <span className="text-sm text-gray-700 capitalize">{type.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum salary ($/year)
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                {...register('salaryMin')}
              />
            </div>

            <div className="flex items-end pb-1">
              <Controller
                name="remote"
                control={control}
                render={({ field }) => (
                  <Toggle
                    checked={field.value || false}
                    onChange={field.onChange}
                    label="Open to remote work"
                  />
                )}
              />
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Notifications */}
      <Card>
        <Card.Header>
          <h3 className="font-medium text-gray-900">Notification Preferences</h3>
        </Card.Header>
        <Card.Body className="divide-y divide-gray-100">
          {[
            { name: 'notif_email', label: 'Email notifications' },
            { name: 'notif_jobs',  label: 'Job match alerts' },
            { name: 'notif_apps',  label: 'Application status updates' },
          ].map(({ name, label }) => (
            <Controller
              key={name}
              name={name}
              control={control}
              render={({ field }) => (
                <Toggle
                  checked={field.value ?? true}
                  onChange={field.onChange}
                  label={label}
                />
              )}
            />
          ))}
        </Card.Body>
        <Card.Footer className="flex justify-end">
          <Button type="submit" loading={isSaving} disabled={!isDirty}>
            Save preferences
          </Button>
        </Card.Footer>
      </Card>
    </form>
  );
};

export default PreferencesForm;
