import { I18nServiceImpl } from "@bitwarden/common/services/i18n.service.impl";

export class WebI18nService extends I18nServiceImpl {
  constructor(systemLanguage: string, localesDirectory: string) {
    super(systemLanguage || "en-US", localesDirectory, async (formattedLocale: string) => {
      const filePath =
        this.localesDirectory +
        "/" +
        formattedLocale +
        "/messages.json?cache=" +
        process.env.CACHE_TAG;
      const localesResult = await fetch(filePath);
      const locales = await localesResult.json();
      return locales;
    });

    // Please leave 'en' where it is, as it's our fallback language in case no translation can be found
    this.supportedTranslationLocales = [
      "en",
      "af",
      "ar",
      "az",
      "be",
      "bg",
      "bn",
      "bs",
      "ca",
      "cs",
      "da",
      "de",
      "el",
      "en-GB",
      "en-IN",
      "eo",
      "es",
      "et",
      "eu",
      "fi",
      "fil",
      "fr",
      "he",
      "hi",
      "hr",
      "hu",
      "id",
      "it",
      "ja",
      "ka",
      "km",
      "kn",
      "ko",
      "lv",
      "ml",
      "nb",
      "nl",
      "nn",
      "pl",
      "pt-PT",
      "pt-BR",
      "ro",
      "ru",
      "si",
      "sk",
      "sl",
      "sr",
      "sv",
      "tr",
      "uk",
      "vi",
      "zh-CN",
      "zh-TW",
    ];
  }
}
