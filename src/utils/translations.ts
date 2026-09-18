import { AppLanguage } from '../types';

export interface Translations {
  langCode: string;
  langLabel: string;
  toggleLangTitle: string;
  clockTitleShow: string;
  clockTitleHide: string;
  localTime: string;
  hourView: string;
  secondView: string;
  hourViewTitle: string;
  secondViewTitle: string;
  simulate: string;
  live: string;
  simulateStart: string;
  simulateActive: string;
  returnLive: string;
  sunrise: string;
  sunset: string;
  speedSuffix: string;
}

export const translations: Record<AppLanguage, Translations> = {
  fa: {
    langCode: 'فا',
    langLabel: 'فارسی',
    toggleLangTitle: 'Switch to English (تغییر به انگلیسی)',
    clockTitleShow: 'نمایش ساعت دیجیتال',
    clockTitleHide: 'پنهان کردن ساعت دیجیتال',
    localTime: 'زمان محلی',
    hourView: 'نمای ساعت',
    secondView: 'نمای ثانیه',
    hourViewTitle: 'بازگشت به نمای ساعت',
    secondViewTitle: 'تغییر به نمای ثانیه',
    simulate: 'شبیه‌سازی',
    live: 'زنده',
    simulateStart: 'شروع شبیه‌سازی زمان',
    simulateActive: 'شبیه‌سازی فعال است (کلیک برای تنظیمات)',
    returnLive: 'بازگشت به زمان زنده',
    sunrise: 'طلوع',
    sunset: 'غروب',
    speedSuffix: '×',
  },
  en: {
    langCode: 'EN',
    langLabel: 'English',
    toggleLangTitle: 'تغییر زبان به فارسی (Switch to Farsi)',
    clockTitleShow: 'Show Digital Clock',
    clockTitleHide: 'Click to hide digital clock',
    localTime: 'Local Time',
    hourView: 'Hour View',
    secondView: 'Second View',
    hourViewTitle: 'Switch to Hour View',
    secondViewTitle: 'Switch to Second View',
    simulate: 'Simulate',
    live: 'Live',
    simulateStart: 'Start Fast-Forward Simulation',
    simulateActive: 'Simulation Active (Click for controls)',
    returnLive: 'Return to Live Time',
    sunrise: 'SUNRISE',
    sunset: 'SUNSET',
    speedSuffix: 'x',
  },
};
