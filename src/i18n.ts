import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import it from './locales/it.json';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

const resources = {
  en: { translation: en },
  it: { translation: it },
};

const isRenderedOnServer = Platform.OS === 'web' && typeof window === 'undefined';

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      let savedLng: string | null = null;
      if (!isRenderedOnServer) {
        savedLng = await AsyncStorage.getItem('user-language');
      }
      const locales = Localization.getLocales();
      const deviceLang = locales && locales.length > 0 ? locales[0].languageCode : 'en';
      const bestLng = savedLng || deviceLang || 'en';
      callback(bestLng);
    } catch {
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: (lng: string) => {
    if (!isRenderedOnServer) {
      AsyncStorage.setItem('user-language', lng).catch(() => {});
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
