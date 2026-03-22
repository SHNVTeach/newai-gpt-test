import { useNavigate } from 'react-router-dom';
import { Plus, Activity, CheckCircle, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { useConditions, deleteCondition, updateCondition } from '../hooks/useConditions';
import { useProfile } from '../context/ProfileContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  monitoring: { label: 'Monitoring', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  recovered: { label: 'Recovered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
};

export function Conditions() {
  const navigate = useNavigate();
  const { activeProfileId } = useProfile();
  const conditions = useConditions(activeProfileId ?? undefined);

  const active = conditions.filter(c => c.status !== 'recovered');
  const recovered = conditions.filter(c => c.status === 'recovered');

  async function markRecovered(id: number) {
    await updateCondition(id, {
      status: 'recovered',
      endDate: new Date().toISOString().split('T')[0],
    });
  }

  if (!activeProfileId) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Activity size={40} className="mx-auto mb-2 opacity-30" />
        <p>Select a profile to view conditions.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Conditions</h2>
        <button
          onClick={() => navigate('/conditions/new')}
          className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> Track New
        </button>
      </div>

      {conditions.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Activity size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No conditions tracked yet</p>
          <p className="text-sm mt-1">Track a cold, migraine, or any condition to monitor your recovery.</p>
          <button
            onClick={() => navigate('/conditions/new')}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            + Track a Condition
          </button>
        </div>
      )}

      {active.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Active</h3>
          <div className="space-y-2">
            {active.map(c => (
              <ConditionCard
                key={c.id}
                condition={c}
                onOpen={() => navigate(`/conditions/${c.id}`)}
                onMarkRecovered={() => markRecovered(c.id!)}
                onDelete={() => deleteCondition(c.id!)}
              />
            ))}
          </div>
        </section>
      )}

      {recovered.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Recovered</h3>
          <div className="space-y-2">
            {recovered.map(c => (
              <ConditionCard
                key={c.id}
                condition={c}
                onOpen={() => navigate(`/conditions/${c.id}`)}
                onMarkRecovered={() => {}}
                onDelete={() => deleteCondition(c.id!)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ConditionCard({
  condition,
  onOpen,
  onMarkRecovered,
  onDelete,
}: {
  condition: { id?: number; name: string; description?: string; startDate: string; status: 'active' | 'recovered' | 'monitoring' };
  onOpen: () => void;
  onMarkRecovered: () => void;
  onDelete: () => void;
}) {
  const cfg = STATUS_CONFIG[condition.status];
  const Icon = cfg.icon;

  const symptomCount = useLiveQuery(
    () => condition.id ? db.symptoms.where('conditionId').equals(condition.id).count() : 0,
    [condition.id]
  ) ?? 0;

  const today = new Date().toISOString().split('T')[0];
  const todayLogCount = useLiveQuery(
    () => condition.id
      ? db.symptomLogs.where('conditionId').equals(condition.id).and(l => l.date === today).count()
      : 0,
    [condition.id, today]
  ) ?? 0;

  const daysSinceStart = Math.floor(
    (Date.now() - new Date(condition.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-2" onClick={onOpen}>
        <div className="flex-1 cursor-pointer">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-800">{condition.name}</span>
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
              <Icon size={10} /> {cfg.label}
            </span>
          </div>
          {condition.description && (
            <p className="text-xs text-gray-500 mb-1">{condition.description}</p>
          )}
          <div className="flex gap-3 text-xs text-gray-400">
            <span>Day {daysSinceStart + 1}</span>
            <span>{symptomCount} symptom{symptomCount !== 1 ? 's' : ''}</span>
            {condition.status !== 'recovered' && symptomCount > 0 && (
              <span className={todayLogCount >= symptomCount ? 'text-green-500' : 'text-orange-500'}>
                {todayLogCount >= symptomCount ? '✓ Logged today' : '! Log today'}
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={18} className="text-gray-400 mt-1 cursor-pointer" onClick={onOpen} />
      </div>

      {condition.status !== 'recovered' && (
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onMarkRecovered}
            className="flex-1 text-xs text-green-600 border border-green-200 bg-green-50 py-1.5 rounded-lg font-medium"
          >
            Mark Recovered
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-red-400 border border-red-100 bg-red-50 px-3 py-1.5 rounded-lg"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
