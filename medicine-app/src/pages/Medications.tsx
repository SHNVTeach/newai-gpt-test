import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Pill } from 'lucide-react';
import { useMedications } from '../hooks/useMedications';
import { useProfile } from '../context/ProfileContext';

const FORM_EMOJI: Record<string, string> = {
  pill: '💊', liquid: '🧪', injection: '💉', patch: '🩹', other: '🔵',
};

export function Medications() {
  const navigate = useNavigate();
  const { activeProfileId } = useProfile();
  const { medications, deleteMedication } = useMedications(activeProfileId ?? undefined);

  async function handleDelete(id: number) {
    if (!confirm('Delete this medication?')) return;
    await deleteMedication(id);
  }

  if (!activeProfileId) {
    return (
      <div className="p-4 text-center text-gray-500 mt-8">
        <p>No profile selected.</p>
        <button onClick={() => navigate('/profiles')} className="mt-2 text-indigo-600 font-medium">Go to Profiles →</button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Medications</h2>
        <button
          onClick={() => navigate('/medications/new')}
          className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {medications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Pill size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No medications yet</p>
          <p className="text-sm mt-1">Tap Add to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {medications.map((med) => (
            <div key={med.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <span className="text-2xl">{FORM_EMOJI[med.form] ?? '💊'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{med.name}</p>
                <p className="text-sm text-gray-500">{med.dosage}{med.instructions ? ` · ${med.instructions}` : ''}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {med.currentCount} remaining
                  {med.currentCount <= med.refillAt && (
                    <span className="ml-1 text-red-500 font-medium">· Refill soon</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => navigate(`/medications/${med.id}/edit`)}
                  className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => med.id && handleDelete(med.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
