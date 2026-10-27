const I18N_STORAGE_KEY = "site-lang";
const DEFAULT_LANG = "zh-TW";

let messages = {};
const requestedLang = new URLSearchParams(window.location.search).get("lang");
let currentLang = ["zh-TW", "en"].includes(requestedLang)
  ? requestedLang
  : (localStorage.getItem(I18N_STORAGE_KEY) || DEFAULT_LANG);

async function loadLocale(lang) {
  const res = await fetch(`./locales/${lang}.json`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load locale: ${lang}`);
  }
  return res.json();
}

function getNestedValue(obj, path) {
  return obj[path];
}

function applyI18n() {
  document.documentElement.lang = currentLang;

  const pageTitleKey = document.body.dataset.pageTitle;
  if (pageTitleKey && typeof messages[pageTitleKey] === "string") {
    document.title = messages[pageTitleKey];
  }

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const value = getNestedValue(messages, key);

    if (typeof value === "string") {
      el.textContent = value;
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    const value = getNestedValue(messages, key);

    if (typeof value === "string") {
      el.setAttribute("placeholder", value);
    }
  });

  document.querySelectorAll("[data-lang-switch]").forEach((button) => {
    const isActive = button.dataset.langSwitch === currentLang;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  window.dispatchEvent(new CustomEvent("sentrum:languagechange", { detail: { lang: currentLang } }));
}

async function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem(I18N_STORAGE_KEY, lang);
  const url = new URL(window.location.href);
  if (lang === DEFAULT_LANG) {
    url.searchParams.delete("lang");
  } else {
    url.searchParams.set("lang", lang);
  }
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  messages = await loadLocale(lang);
  applyI18n();

  if (typeof window.renderProductDetail === "function") {
    window.renderProductDetail();
  }
}

async function initI18n() {
  try {
    messages = await loadLocale(currentLang);
  } catch {
    currentLang = DEFAULT_LANG;
    messages = await loadLocale(DEFAULT_LANG);
  }

  applyI18n();

}


window.getCurrentLang = () => currentLang;
window.initI18n = initI18n;
window.setLanguage = setLanguage;
