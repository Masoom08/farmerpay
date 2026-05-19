/**
 * @farmerpay/i18n — TRUST v2 internationalisation factory
 *
 * Framework-agnostic module that exports locale data and config helpers.
 * - Desktop apps (Next.js) use this with i18next
 * - Mobile app (Expo) uses this with i18n-js
 *
 * Locale loading: locale JSONs live in ../locales/{locale}/trust.json
 */

import enTrust from '../locales/en/trust.json';
import hiTrust from '../locales/hi/trust.json';
import mrTrust from '../locales/mr/trust.json';
import teTrust from '../locales/te/trust.json';
import knTrust from '../locales/kn/trust.json';
import orTrust from '../locales/or/trust.json';

export const SUPPORTED_LOCALES = ['en', 'hi', 'mr', 'te', 'kn', 'or'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const FALLBACK_LOCALE: SupportedLocale = 'en';

/** Namespace for TRUST v2 strings */
export const TRUST_NAMESPACE = 'trust';

/**
 * All locale resources keyed by locale code.
 * Consumed by i18next (desktop) and i18n-js (mobile) initialisers.
 */
export const resources = {
  en: { [TRUST_NAMESPACE]: enTrust },
  hi: { [TRUST_NAMESPACE]: hiTrust },
  mr: { [TRUST_NAMESPACE]: mrTrust },
  te: { [TRUST_NAMESPACE]: teTrust },
  kn: { [TRUST_NAMESPACE]: knTrust },
  or: { [TRUST_NAMESPACE]: orTrust },
} as const;

/**
 * Config object for i18next initialisation (desktop).
 *
 * Usage in Next.js app:
 *   import i18next from 'i18next';
 *   import { i18nextConfig } from '@farmerpay/i18n';
 *   i18next.init(i18nextConfig);
 */
export const i18nextConfig = {
  resources,
  lng: DEFAULT_LOCALE,
  fallbackLng: FALLBACK_LOCALE,
  defaultNS: TRUST_NAMESPACE,
  ns: [TRUST_NAMESPACE],
  interpolation: { escapeValue: false },
} as const;

/**
 * Flat translations object for i18n-js initialisation (mobile).
 *
 * Usage in Expo app:
 *   import { I18n } from 'i18n-js';
 *   import { i18nJsTranslations, DEFAULT_LOCALE } from '@farmerpay/i18n';
 *   const i18n = new I18n(i18nJsTranslations);
 *   i18n.defaultLocale = DEFAULT_LOCALE;
 *   i18n.enableFallback = true;
 */
export const i18nJsTranslations = {
  en: enTrust,
  hi: hiTrust,
  mr: mrTrust,
  te: teTrust,
  kn: knTrust,
  or: orTrust,
} as const;

/**
 * Locale metadata — display names for language picker UI.
 */
export const localeLabels: Record<SupportedLocale, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  hi: { native: 'हिन्दी', english: 'Hindi' },
  mr: { native: 'मराठी', english: 'Marathi' },
  te: { native: 'తెలుగు', english: 'Telugu' },
  kn: { native: 'ಕನ್ನಡ', english: 'Kannada' },
  or: { native: 'ଓଡ଼ିଆ', english: 'Odia' },
};
