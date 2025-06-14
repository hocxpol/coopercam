import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { messages } from "./languages";

i18n.use(LanguageDetector).init({
	debug: false,
	defaultNS: ["translations", "errors"],
	fallbackLng: "pt",
	ns: ["translations", "errors"],
	resources: messages,
	detection: {
		order: ['localStorage', 'navigator'],
		caches: ['localStorage']
	}
});

export { i18n };
