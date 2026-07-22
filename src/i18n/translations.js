import common from './dictionaries/common';
import nav from './dictionaries/nav';
import dashboard from './dictionaries/dashboard';

const NAMESPACES = { common, nav, dashboard };

function buildLanguageDict(lang) {
  return Object.fromEntries(Object.entries(NAMESPACES).map(([ns, dict]) => [ns, dict[lang]]));
}

export const translations = {
  fr: buildLanguageDict('fr'),
  en: buildLanguageDict('en'),
};

function getPath(obj, path) {
  return path.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), obj);
}

export function translate(lang, key, vars) {
  const dict = translations[lang] || translations.fr;
  const raw = getPath(dict, key) ?? getPath(translations.fr, key) ?? key;
  if (!vars) return raw;
  return Object.entries(vars).reduce((str, [k, v]) => str.replaceAll(`{{${k}}}`, String(v)), raw);
}
