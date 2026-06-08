import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateSkills, resetSaveStatus } from '../../../features/profile/profileSlice.js';
import { showToast } from '../../../features/ui/uiSlice.js';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import { Plus } from 'lucide-react';

const MAX_SKILLS = 100;

const SkillsManager = () => {
  const dispatch = useDispatch();
  const { data: profile, saveStatus, saveError } = useSelector((s) => s.profile);

  const [skills, setSkills] = useState([]);
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');

  useEffect(() => {
    if (profile?.skills) setSkills([...profile.skills]);
  }, [profile?.skills]);

  useEffect(() => {
    if (saveStatus === 'succeeded') {
      dispatch(showToast({ message: 'Skills saved', type: 'success' }));
      dispatch(resetSaveStatus());
    }
  }, [saveStatus, dispatch]);

  const addSkill = (value) => {
    const skill = value.trim().toLowerCase();
    if (!skill) return;
    if (skill.length > 50) { setInputError('Skill name too long (max 50 chars)'); return; }
    if (skills.includes(skill)) { setInputError('Skill already added'); return; }
    if (skills.length >= MAX_SKILLS) { setInputError(`Maximum ${MAX_SKILLS} skills`); return; }

    setSkills((prev) => [...prev, skill]);
    setInput('');
    setInputError('');
  };

  const removeSkill = (skill) => setSkills((prev) => prev.filter((s) => s !== skill));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(input);
    }
  };

  const handleSave = () => dispatch(updateSkills(skills));

  const isDirty = JSON.stringify(skills) !== JSON.stringify(profile?.skills || []);
  const isSaving = saveStatus === 'loading';

  return (
    <Card>
      <Card.Header>
        <h3 className="font-medium text-gray-900">Skills</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Add skills that represent your expertise. These are used for AI job matching.
        </p>
      </Card.Header>

      <Card.Body className="space-y-4">
        {saveError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {saveError}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setInputError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="Type a skill and press Enter…"
              className={[
                'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500',
                inputError ? 'border-red-400' : 'border-gray-300',
              ].join(' ')}
            />
            {inputError && <p className="mt-1 text-xs text-red-500">{inputError}</p>}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => addSkill(input)}
            aria-label="Add skill"
          >
            <Plus size={16} />
            Add
          </Button>
        </div>

        {/* Skill chips */}
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2 min-h-[48px] p-3 border border-dashed border-gray-200 rounded-lg">
            {skills.map((skill) => (
              <Badge key={skill} onRemove={() => removeSkill(skill)}>
                {skill}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-20 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400">
            No skills added yet
          </div>
        )}

        <p className="text-xs text-gray-400">
          {skills.length} / {MAX_SKILLS} skills · Press Enter or comma to add
        </p>
      </Card.Body>

      <Card.Footer className="flex justify-end">
        <Button onClick={handleSave} loading={isSaving} disabled={!isDirty}>
          Save skills
        </Button>
      </Card.Footer>
    </Card>
  );
};

export default SkillsManager;
