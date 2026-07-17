import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";
import useBoundStore from "@/stores/useBoundStore";
import { getTranslation, loadTranslations } from "@/i18n/translations";
import type { Language } from "@/stores/uiSlice";

const TranslationLanguageContext = createContext<Language | null>(null);

export function TranslationLanguageProvider({
  language,
  children,
}: {
  language: Language;
  children: ReactNode;
}) {
  return (
    <TranslationLanguageContext.Provider value={language}>
      {children}
    </TranslationLanguageContext.Provider>
  );
}

export function useTranslation(languageOverride?: Language) {
  const storedLanguage = useBoundStore((state) => state.ui.language);
  const contextLanguage = useContext(TranslationLanguageContext);
  const language = languageOverride ?? contextLanguage ?? storedLanguage;
  const setLanguage = useBoundStore((state) => state.ui.setLanguage);
  const [, translationsLoaded] = useReducer(
    (version: number) => version + 1,
    0,
  );

  useEffect(() => {
    let active = true;
    void loadTranslations(language).then(() => {
      if (active) translationsLoaded();
    });
    return () => {
      active = false;
    };
  }, [language]);

  return {
    translate: (text: string) => getTranslation(text, language),
    currentLanguage: language,
    setCurrentLanguage: async (lang: "es" | "en" | "pt" | "sw" | "fr") => {
      await loadTranslations(lang);
      setLanguage(lang);
    },
  };
}
