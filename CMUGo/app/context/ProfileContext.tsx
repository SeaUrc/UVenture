import React, { createContext, useContext, useState } from 'react';
import { Text } from 'react-native';

type ProfileContextType = {
  profileImage: string | null;
  setProfileImage: (uri: string | null) => void;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profileImage, setProfileImage] = useState<string | null>(null);

  return (
      <ProfileContext.Provider value={{ profileImage, setProfileImage }}>
        {children}
      </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    // Don't throw an error that might be rendered, just return a default value or log
    console.error('useProfile must be used within a ProfileProvider');
    return { profileImage: null, setProfileImage: () => {} };
  }
  return context;
};

export default ProfileProvider;