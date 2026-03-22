import { useState } from 'react';
import { UserPlus, Trash2, Check } from 'lucide-react';
import { useProfiles } from '../hooks/useProfiles';
import { useProfile } from '../context/ProfileContext';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
const AVATARS = ['😊', '👩', '👦', '👴', '👵', '🧒', '👨', '🐱'];

export function Profiles() {
  const { profiles, addProfile, deleteProfile } = useProfiles();
  const { activeProfileId, setActiveProfileId } = useProfile();

  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    const id = await addProfile({ name: name.trim(), color, avatar });
    setActiveProfileId(id as number);
    setName('');
    setAdding(false);
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this profile and all its data?')) return;
    await deleteProfile(id);
    if (activeProfileId === id) {
      const remaining = profiles.filter((p) => p.id !== id);
      setActiveProfileId(remaining[0]?.id ?? null);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Profiles</h2>

      <div className="space-y-2">
        {profiles.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
              p.id === activeProfileId ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
            }`}
            onClick={() => p.id && setActiveProfileId(p.id)}
          >
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: p.color }}
            >
              {p.avatar}
            </span>
            <span className="flex-1 font-medium text-gray-800">{p.name}</span>
            {p.id === activeProfileId && <Check size={18} className="text-indigo-600" />}
            {profiles.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); p.id && handleDelete(p.id); }}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <input
            autoFocus
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Profile name (e.g. Mom, Alex)"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <div>
            <p className="text-xs text-gray-500 mb-1">Color</p>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Avatar</p>
            <div className="flex gap-2 flex-wrap">
              {AVATARS.map(a => (
                <button
                  key={a}
                  className={`w-9 h-9 text-xl rounded-lg border-2 ${avatar === a ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                  onClick={() => setAvatar(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium"
            >
              Add Profile
            </button>
            <button
              onClick={() => setAdding(false)}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 text-gray-500 py-3 rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <UserPlus size={18} />
          Add Profile
        </button>
      )}
    </div>
  );
}
