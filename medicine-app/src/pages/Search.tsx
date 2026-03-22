import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Pill, Activity, Clock, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { useProfile } from '../context/ProfileContext';

type ResultType = 'medication' | 'condition' | 'history';

interface SearchResult {
  type: ResultType;
  id: number;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  path: string;
}

export function Search() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { activeProfileId } = useProfile();

  const medications = useLiveQuery(
    () => activeProfileId ? db.medications.where('profileId').equals(activeProfileId).toArray() : [],
    [activeProfileId]
  ) ?? [];

  const conditions = useLiveQuery(
    () => activeProfileId ? db.conditions.where('profileId').equals(activeProfileId).toArray() : [],
    [activeProfileId]
  ) ?? [];

  const doseLogs = useLiveQuery(
    async () => {
      if (!activeProfileId) return [];
      const meds = await db.medications.where('profileId').equals(activeProfileId).toArray();
      const medIds = meds.map(m => m.id!);
      if (medIds.length === 0) return [];
      return db.doseLogs.where('medicationId').anyOf(medIds).reverse().limit(200).toArray();
    },
    [activeProfileId]
  ) ?? [];

  const results: SearchResult[] = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const out: SearchResult[] = [];

    for (const med of medications) {
      if (
        med.name.toLowerCase().includes(q) ||
        med.dosage.toLowerCase().includes(q) ||
        (med.instructions ?? '').toLowerCase().includes(q)
      ) {
        out.push({
          type: 'medication',
          id: med.id!,
          title: med.name,
          subtitle: `${med.dosage} · ${med.form}${med.instructions ? ` · ${med.instructions}` : ''}`,
          badge: med.active ? 'Active' : 'Inactive',
          badgeColor: med.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
          path: `/medications/${med.id}/edit`,
        });
      }
    }

    for (const cond of conditions) {
      if (
        cond.name.toLowerCase().includes(q) ||
        (cond.description ?? '').toLowerCase().includes(q)
      ) {
        out.push({
          type: 'condition',
          id: cond.id!,
          title: cond.name,
          subtitle: `Started ${cond.startDate}${cond.description ? ` · ${cond.description}` : ''}`,
          badge: cond.status === 'active' ? 'Active' : cond.status === 'recovered' ? 'Recovered' : 'Monitoring',
          badgeColor:
            cond.status === 'active' ? 'bg-red-100 text-red-700' :
            cond.status === 'recovered' ? 'bg-green-100 text-green-700' :
            'bg-yellow-100 text-yellow-700',
          path: `/conditions/${cond.id}`,
        });
      }
    }

    // Search history by medication name match
    const medMap = Object.fromEntries(medications.map(m => [m.id!, m]));
    const seenDates = new Set<string>();
    for (const log of doseLogs) {
      const med = medMap[log.medicationId];
      if (!med) continue;
      if (!med.name.toLowerCase().includes(q)) continue;
      const dateKey = `${log.medicationId}-${log.scheduledTime}`;
      if (seenDates.has(dateKey)) continue;
      seenDates.add(dateKey);
      out.push({
        type: 'history',
        id: log.id!,
        title: med.name,
        subtitle: `${log.scheduledTime} · ${log.status}${log.notes ? ` · ${log.notes}` : ''}`,
        badge: log.status,
        badgeColor:
          log.status === 'taken' ? 'bg-green-100 text-green-700' :
          log.status === 'missed' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-500',
        path: '/history',
      });
    }

    return out.slice(0, 30);
  }, [query, medications, conditions, doseLogs]);

  const grouped = useMemo(() => {
    const g: Record<ResultType, SearchResult[]> = { medication: [], condition: [], history: [] };
    for (const r of results) g[r.type].push(r);
    return g;
  }, [results]);

  const SECTION_CONFIG: { type: ResultType; label: string; icon: React.ReactNode }[] = [
    { type: 'medication', label: 'Medications', icon: <Pill size={14} /> },
    { type: 'condition', label: 'Conditions', icon: <Activity size={14} /> },
    { type: 'history', label: 'Dose History', icon: <Clock size={14} /> },
  ];

  return (
    <div className="p-4 space-y-4 pb-24">
      <h2 className="text-xl font-bold text-gray-800">Search</h2>

      {/* Search input */}
      <div className="relative">
        <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus
          className="input pl-9 pr-9 text-base"
          placeholder="Search medications, conditions, history..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Empty state */}
      {!query && (
        <div className="text-center py-12 text-gray-400">
          <SearchIcon size={40} className="mx-auto mb-2 opacity-30" />
          <p>Type to search across your medications, conditions, and dose history.</p>
        </div>
      )}

      {/* No results */}
      {query && results.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>No results for "<strong>{query}</strong>"</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {SECTION_CONFIG.map(({ type, label, icon }) => {
            const items = grouped[type];
            if (items.length === 0) return null;
            return (
              <section key={type}>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {icon} {label} ({items.length})
                </div>
                <div className="space-y-2">
                  {items.map(result => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => navigate(result.path)}
                      className="w-full bg-white rounded-xl border border-gray-200 p-3 text-left flex items-start justify-between gap-2 active:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {highlightMatch(result.title, query)}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{result.subtitle}</p>
                      </div>
                      {result.badge && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${result.badgeColor}`}>
                          {result.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-800 rounded">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
