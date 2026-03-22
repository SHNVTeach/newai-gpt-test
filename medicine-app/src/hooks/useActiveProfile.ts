import { useState, useEffect } from 'react';
import { db } from '../db/database';

const STORAGE_KEY = 'activeProfileId';

export function useActiveProfile() {
  const [activeProfileId, setActiveProfileIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });

  function setActiveProfileId(id: number | null) {
    setActiveProfileIdState(id);
    if (id === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(id));
  }

  // Auto-select first profile if none selected
  useEffect(() => {
    if (activeProfileId !== null) return;
    db.profiles.toArray().then(profiles => {
      if (profiles.length > 0 && profiles[0].id) {
        setActiveProfileId(profiles[0].id);
      }
    });
  }, [activeProfileId]);

  return { activeProfileId, setActiveProfileId };
}
