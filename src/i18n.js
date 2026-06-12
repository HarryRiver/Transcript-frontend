import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import local translations
import translationVI from './i18n/locales/vi.json';
import translationEN from './i18n/locales/en.json';

const resources = {
  vi: {
    translation: translationVI
  },
  en: {
    translation: translationEN
  }
};

i18n
  .use(LanguageDetector) // Detects user browser language
  .use(initReactI18next) // Binds react-i18next to the instance
  .init({
    resources,
    fallbackLng: 'vi', // Use vi as the default fallback language
    interpolation: {
      escapeValue: false // React already escapes values
    },
    detection: {
      order: ['queryString', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie']
    }
  });

export default i18n;
