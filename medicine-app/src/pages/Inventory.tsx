import { useState } from 'react';
import { Minus, Plus, Package } from 'lucide-react';
import { useMedications } from '../hooks/useMedications';
import { useProfile } from '../context/ProfileContext';

export function Inventory() {
  const { activeProfileId } = useProfile();
  const { medications, adjustCount, updateMedication } = useMedications(activeProfileId ?? undefined);
  const [editing, setEditing] = useState<Record<number, string>>({});

  const lowMeds = medications.filter((m) => m.currentCount <= m.refillAt);
  const okMeds = medications.filter((m) => m.currentCount > m.refillAt);

  function startEdit(id: number, current: number) {
    setEditing(prev => ({ ...prev, [id]: String(current) }));
  }

  async function commitEdit(id: number) {
    const val = Number(editing[id]);
    if (!isNaN(val) && val >= 0) {
      await updateMedication(id, { currentCount: val });
    }
    setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Inventory</h2>

      {medications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No medications tracked</p>
        </div>
      ) : (
        <>
          {lowMeds.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <p className="text-sm font-semibold text-red-600">Needs Refill</p>
              </div>
              <MedList meds={lowMeds} editing={editing} onAdjust={adjustCount} onStartEdit={startEdit} onCommit={commitEdit} onChange={(id, v) => setEditing(prev => ({ ...prev, [id]: v }))} />
            </div>
          )}

          {okMeds.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-sm font-semibold text-gray-600">Well Stocked</p>
              </div>
              <MedList meds={okMeds} editing={editing} onAdjust={adjustCount} onStartEdit={startEdit} onCommit={commitEdit} onChange={(id, v) => setEditing(prev => ({ ...prev, [id]: v }))} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MedList({ meds, editing, onAdjust, onStartEdit, onCommit, onChange }: {
  meds: ReturnType<typeof useMedications>['medications'];
  editing: Record<number, string>;
  onAdjust: (id: number, delta: number) => void;
  onStartEdit: (id: number, current: number) => void;
  onCommit: (id: number) => void;
  onChange: (id: number, v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {meds.map((med) => {
        const isLow = med.currentCount <= med.refillAt;
        const isEditing = med.id !== undefined && med.id in editing;
        return (
          <div key={med.id} className={`bg-white rounded-xl border p-4 ${isLow ? 'border-red-200' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-gray-800">{med.name}</p>
                <p className="text-xs text-gray-400">{med.dosage} · Alert at {med.refillAt}</p>
              </div>
              {isLow && (
                <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">Low</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => med.id && onAdjust(med.id, -1)}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600"
              >
                <Minus size={14} />
              </button>
              {isEditing && med.id !== undefined ? (
                <input
                  autoFocus
                  className="w-16 text-center border border-indigo-400 rounded-lg py-1 text-sm font-bold focus:outline-none"
                  value={editing[med.id]}
                  onChange={e => med.id !== undefined && onChange(med.id, e.target.value)}
                  onBlur={() => med.id !== undefined && onCommit(med.id)}
                  onKeyDown={e => e.key === 'Enter' && med.id !== undefined && onCommit(med.id)}
                />
              ) : (
                <button
                  onClick={() => med.id !== undefined && onStartEdit(med.id, med.currentCount)}
                  className={`w-16 text-center text-lg font-bold ${isLow ? 'text-red-500' : 'text-gray-800'}`}
                >
                  {med.currentCount}
                </button>
              )}
              <button
                onClick={() => med.id && onAdjust(med.id, 1)}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600"
              >
                <Plus size={14} />
              </button>
              <span className="text-xs text-gray-400 ml-1">remaining</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
