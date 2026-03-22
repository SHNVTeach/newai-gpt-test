import { useState } from 'react';
import { Plus, Zap, Trash2, CheckCircle } from 'lucide-react';
import { useTriggers, useTriggerLogs, addTrigger, deleteTrigger, logTrigger, deleteTriggerLog } from '../hooks/useTriggers';
import { useConditions } from '../hooks/useConditions';
import { useProfile } from '../context/ProfileContext';
import type { Trigger } from '../types';

const CATEGORY_CONFIG: Record<Trigger['category'], { emoji: string; color: string }> = {
  food: { emoji: '🍔', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  lifestyle: { emoji: '🏃', color: 'bg-green-50 text-green-700 border-green-200' },
  environment: { emoji: '🌿', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  stress: { emoji: '😰', color: 'bg-red-50 text-red-700 border-red-200' },
  other: { emoji: '✦', color: 'bg-gray-50 text-gray-700 border-gray-200' },
};

const SUGGESTED_TRIGGERS: { name: string; category: Trigger['category'] }[] = [
  { name: 'High stress', category: 'stress' },
  { name: 'Poor sleep', category: 'lifestyle' },
  { name: 'Caffeine', category: 'food' },
  { name: 'Alcohol', category: 'food' },
  { name: 'Skipped meal', category: 'food' },
  { name: 'Exercise', category: 'lifestyle' },
  { name: 'Screen time', category: 'lifestyle' },
  { name: 'Pollen', category: 'environment' },
  { name: 'Dust', category: 'environment' },
  { name: 'Cold weather', category: 'environment' },
];

export function Triggers() {
  const { activeProfileId } = useProfile();
  const triggers = useTriggers(activeProfileId ?? undefined);
  const logs = useTriggerLogs(activeProfileId ?? undefined);
  const conditions = useConditions(activeProfileId ?? undefined);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTriggerName, setNewTriggerName] = useState('');
  const [newCategory, setNewCategory] = useState<Trigger['category']>('other');

  // Log form state
  const [loggingTriggerId, setLoggingTriggerId] = useState<number | null>(null);
  const [logIntensity, setLogIntensity] = useState(5);
  const [logConditionId, setLogConditionId] = useState<number | ''>('');
  const [logNotes, setLogNotes] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => l.date === today);

  async function handleAddTrigger() {
    if (!activeProfileId || !newTriggerName.trim()) return;
    await addTrigger({ profileId: activeProfileId, name: newTriggerName.trim(), category: newCategory });
    setNewTriggerName('');
    setShowAddForm(false);
  }

  async function handleLogTrigger() {
    if (!activeProfileId || !loggingTriggerId) return;
    await logTrigger({
      triggerId: loggingTriggerId,
      profileId: activeProfileId,
      conditionId: logConditionId ? Number(logConditionId) : undefined,
      date: today,
      loggedAt: Date.now(),
      intensity: logIntensity,
      notes: logNotes.trim() || undefined,
    });
    setLoggingTriggerId(null);
    setLogIntensity(5);
    setLogConditionId('');
    setLogNotes('');
  }

  if (!activeProfileId) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Zap size={40} className="mx-auto mb-2 opacity-30" />
        <p>Select a profile to track triggers.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Triggers</h2>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      <p className="text-sm text-gray-500">Track potential triggers (stress, food, environment) and link them to your conditions.</p>

      {/* Add trigger form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-indigo-200 p-4 space-y-3">
          <h3 className="font-semibold text-gray-700">New Trigger</h3>
          <input
            className="input"
            placeholder="Trigger name..."
            value={newTriggerName}
            onChange={e => setNewTriggerName(e.target.value)}
          />
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Category</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(CATEGORY_CONFIG) as [Trigger['category'], { emoji: string; color: string }][]).map(([cat, cfg]) => (
                <button
                  key={cat}
                  onClick={() => setNewCategory(cat)}
                  className={`text-sm px-3 py-1.5 rounded-full border font-medium transition-colors ${
                    newCategory === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  {cfg.emoji} {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Quick suggestions */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-1">
              {SUGGESTED_TRIGGERS.filter(s => !triggers.some(t => t.name.toLowerCase() === s.name.toLowerCase())).map(s => (
                <button
                  key={s.name}
                  onClick={() => { setNewTriggerName(s.name); setNewCategory(s.category); }}
                  className="text-xs px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 hover:border-indigo-400"
                >
                  + {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowAddForm(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm text-gray-600">Cancel</button>
            <button
              onClick={handleAddTrigger}
              disabled={!newTriggerName.trim()}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
            >
              Add Trigger
            </button>
          </div>
        </div>
      )}

      {/* Log trigger (inline) */}
      {loggingTriggerId && (
        <div className="bg-white rounded-xl border border-orange-200 p-4 space-y-3">
          <h3 className="font-semibold text-gray-700">
            Log: {triggers.find(t => t.id === loggingTriggerId)?.name}
          </h3>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">
              Intensity: <span className={`font-bold ${logIntensity <= 3 ? 'text-green-600' : logIntensity <= 6 ? 'text-yellow-600' : 'text-red-600'}`}>{logIntensity}/10</span>
            </label>
            <input type="range" min={1} max={10} value={logIntensity} onChange={e => setLogIntensity(Number(e.target.value))} className="w-full" />
          </div>
          {conditions.filter(c => c.status !== 'recovered').length > 0 && (
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Link to condition (optional)</label>
              <select className="input" value={logConditionId} onChange={e => setLogConditionId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">None</option>
                {conditions.filter(c => c.status !== 'recovered').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <input className="input" placeholder="Notes..." value={logNotes} onChange={e => setLogNotes(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={() => setLoggingTriggerId(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            <button onClick={handleLogTrigger} className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-semibold">Log It</button>
          </div>
        </div>
      )}

      {/* Trigger list */}
      {triggers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Zap size={40} className="mx-auto mb-2 opacity-30" />
          <p className="font-medium">No triggers set up</p>
          <p className="text-sm mt-1">Add triggers like stress, caffeine, or poor sleep to find patterns.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Your Triggers</h3>
            {triggers.map(trigger => {
              const cfg = CATEGORY_CONFIG[trigger.category];
              const todayLogged = todayLogs.some(l => l.triggerId === trigger.id);
              const triggerLogs = logs.filter(l => l.triggerId === trigger.id);
              return (
                <div key={trigger.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.color}`}>
                        {cfg.emoji} {trigger.category}
                      </span>
                      <span className="font-medium text-gray-800">{trigger.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {todayLogged && <CheckCircle size={14} className="text-green-500" />}
                      <span className="text-xs text-gray-400">{triggerLogs.length}×</span>
                      <button onClick={() => { setLoggingTriggerId(trigger.id!); }} className="text-xs text-indigo-600 border border-indigo-200 px-2 py-1 rounded-lg">
                        + Log
                      </button>
                      <button onClick={() => deleteTrigger(trigger.id!)} className="text-gray-300 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Today's trigger log summary */}
          {todayLogs.length > 0 && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-orange-700 mb-2">Today's Triggers</h3>
              <div className="space-y-2">
                {todayLogs.map(log => {
                  const trigger = triggers.find(t => t.id === log.triggerId);
                  return (
                    <div key={log.id} className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-800">{trigger?.name ?? 'Unknown'}</span>
                        <span className={`ml-2 text-xs font-bold ${log.intensity <= 3 ? 'text-green-600' : log.intensity <= 6 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {log.intensity}/10
                        </span>
                        {log.notes && <p className="text-xs text-gray-400">{log.notes}</p>}
                      </div>
                      <button onClick={() => deleteTriggerLog(log.id!)} className="text-gray-300 hover:text-red-400">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
