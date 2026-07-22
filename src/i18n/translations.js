import common from './dictionaries/common';
import nav from './dictionaries/nav';
import dashboard from './dictionaries/dashboard';
import sales from './dictionaries/sales';
import purchases from './dictionaries/purchases';
import products from './dictionaries/products';
import stock from './dictionaries/stock';
import settings from './dictionaries/settings';
import clients from './dictionaries/clients';
import suppliers from './dictionaries/suppliers';
import team from './dictionaries/team';
import activityLog from './dictionaries/activityLog';
import accounting from './dictionaries/accounting';
import reports from './dictionaries/reports';

const NAMESPACES = {
  common,
  nav,
  dashboard,
  sales,
  purchases,
  products,
  stock,
  settings,
  clients,
  suppliers,
  team,
  activityLog,
  accounting,
  reports,
};

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
