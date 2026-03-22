import React, { createContext, useContext } from 'react';
import { useActiveProfile } from '../hooks/useActiveProfile';

interface ProfileContextType {
  activeProfileId: number | null;
  setActiveProfileId: (id: number | null) => void;
}

const ProfileContext = createContext<ProfileContextType>({
  activeProfileId: null,
  setActiveProfileId: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const value = useActiveProfile();
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext);
}
