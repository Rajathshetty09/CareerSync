import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, uploadAvatar, resetSaveStatus } from '../../../features/profile/profileSlice.js';
import { useDispatch as useReduxDispatch } from 'react-redux';
import { showToast } from '../../../features/ui/uiSlice.js';
import FormField from '../../../components/forms/FormField.jsx';
import Button from '../../../components/ui/Button.jsx';
import Card from '../../../components/ui/Card.jsx';
import { Camera, User } from 'lucide-react';

const PersonalInfoForm = () => {
  const dispatch = useDispatch();
  const { data: profile, saveStatus, saveError } = useSelector((s) => s.profile);
  const fileRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm();

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      reset({
        name:             profile.name || '',
        'profile.bio':      profile.profile?.bio || '',
        'profile.location': profile.profile?.location || '',
        'profile.phone':    profile.profile?.phone || '',
        'profile.website':  profile.profile?.website || '',
        'profile.linkedin': profile.profile?.linkedin || '',
        'profile.github':   profile.profile?.github || '',
      });
    }
  }, [profile, reset]);

  // Toast on save
  useEffect(() => {
    if (saveStatus === 'succeeded') {
      dispatch(showToast({ message: 'Profile updated successfully', type: 'success' }));
      dispatch(resetSaveStatus());
    }
  }, [saveStatus, dispatch]);

  const onSubmit = (formData) => {
    const payload = {
      name: formData.name,
      profile: {
        bio:      formData['profile.bio'],
        location: formData['profile.location'],
        phone:    formData['profile.phone'],
        website:  formData['profile.website'],
        linkedin: formData['profile.linkedin'],
        github:   formData['profile.github'],
      },
    };
    dispatch(updateProfile(payload));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarPreview(URL.createObjectURL(file));

    const fd = new FormData();
    fd.append('avatar', file);
    dispatch(uploadAvatar(fd)).then(() => {
      dispatch(showToast({ message: 'Avatar updated', type: 'success' }));
    });
  };

  const avatarSrc = avatarPreview || profile?.profile?.avatar;
  const isSaving = saveStatus === 'loading';

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <Card>
        <Card.Body className="flex items-center gap-6">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-primary-400" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white shadow hover:bg-primary-700 transition-colors"
              aria-label="Change avatar"
            >
              <Camera size={13} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="font-medium text-gray-900">{profile?.name}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              JPG, PNG, or WebP · Max 5 MB
            </p>
          </div>
        </Card.Body>
      </Card>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <Card.Header>
            <h3 className="font-medium text-gray-900">Personal Information</h3>
          </Card.Header>
          <Card.Body className="space-y-4">
            {saveError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {saveError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Full name"
                error={errors.name}
                {...register('name', {
                  required: 'Name is required',
                  minLength: { value: 2, message: 'At least 2 characters' },
                  maxLength: { value: 50, message: 'Max 50 characters' },
                })}
              />
              <FormField
                label="Phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                error={errors['profile.phone']}
                {...register('profile.phone')}
              />
            </div>

            <FormField
              label="Bio"
              placeholder="A short description about yourself…"
              error={errors['profile.bio']}
              {...register('profile.bio', {
                maxLength: { value: 300, message: 'Max 300 characters' },
              })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Location"
                placeholder="City, Country"
                error={errors['profile.location']}
                {...register('profile.location')}
              />
              <FormField
                label="Website"
                type="url"
                placeholder="https://yourwebsite.com"
                error={errors['profile.website']}
                {...register('profile.website')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="LinkedIn"
                type="url"
                placeholder="https://linkedin.com/in/you"
                error={errors['profile.linkedin']}
                {...register('profile.linkedin')}
              />
              <FormField
                label="GitHub"
                type="url"
                placeholder="https://github.com/you"
                error={errors['profile.github']}
                {...register('profile.github')}
              />
            </div>
          </Card.Body>
          <Card.Footer className="flex justify-end">
            <Button type="submit" loading={isSaving} disabled={!isDirty}>
              Save changes
            </Button>
          </Card.Footer>
        </Card>
      </form>
    </div>
  );
};

export default PersonalInfoForm;
