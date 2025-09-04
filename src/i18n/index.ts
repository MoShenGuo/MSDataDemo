import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as RNLocalize from "react-native-localize";

import en from "./locales/en.json";
import zh from "./locales/zh.json";

const resources = {
  en: { translation: en },
  zh: { translation: zh },
};

// 获取系统语言
const getSystemLanguage = () => {
  const locales = RNLocalize.getLocales();
  if (locales && locales.length > 0) {
    return locales[0].languageCode.startsWith("zh") ? "zh" : "en";
  }
  return "en"; // 默认英语
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getSystemLanguage(),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
