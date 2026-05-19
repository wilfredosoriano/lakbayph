import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSetting, setSetting } from '../database/db';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [userName, setUserNameState] = useState('Lakbayero');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSetting('userName', 'Lakbayero').then((name) => {
      setUserNameState(name);
      setLoaded(true);
    });
  }, []);

  const setUserName = async (name) => {
    const trimmed = name.trim() || 'Lakbayero';
    setUserNameState(trimmed);
    await setSetting('userName', trimmed);
  };

  return (
    <UserContext.Provider value={{ userName, setUserName, loaded }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
