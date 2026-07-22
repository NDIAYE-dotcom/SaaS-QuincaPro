import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { translate } from '../i18n/translations';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'quincapro-lang';

function getInitialLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'fr' || stored === 'en') return stored;
  return 'fr';
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = useCallback((lang) => {
    localStorage.setItem(STORAGE_KEY, lang);
    setLanguageState(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === 'fr' ? 'en' : 'fr';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const t = useCallback((key, vars) => translate(language, key, vars), [language]);

  const value = useMemo(
    () => ({ language, toggleLanguage, setLanguage, t }),
    [language, toggleLanguage, setLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage doit être utilisé à l’intérieur de <LanguageProvider>');
  return context;
}
