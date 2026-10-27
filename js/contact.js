const contactForm = document.getElementById("contactForm");
const contactSubmitBtn = document.getElementById("contactSubmitBtn");
const contactFormStatus = document.getElementById("contactFormStatus");
const accessKeyInput = document.getElementById("web3formsAccessKey");
const formStartedAt = document.getElementById("formStartedAt");
const contactConfig = window.SENTRUM_CONTACT_CONFIG || {};
const submissionStartedAt = Date.now();
let isSubmitting = false;

const contactMessages = {
  setup: {
    "zh-TW": "表單程式已完成；公司收件信箱核准並驗證新 Web3Forms Key 後即可啟用真實寄送。",
    en: "The form workflow is ready. Live delivery will be enabled after the company inbox approves and verifies a new Web3Forms key."
  },
  invalid: {
    "zh-TW": "請先完整填寫必填欄位並同意個資告知。",
    en: "Please complete all required fields and accept the privacy notice."
  },
  unavailable: {
    "zh-TW": "線上表單尚待公司完成收件驗證，請暫時改用頁面上的 Email 或電話聯絡。",
    en: "Online delivery is awaiting company recipient verification. Please use the email address or phone number shown on this page for now."
  },
  sending: {
    "zh-TW": "正在安全送出，請稍候…",
    en: "Sending securely. Please wait…"
  },
  success: {
    "zh-TW": "詢問已成功送出，我們會依內容與你聯絡。",
    en: "Your inquiry was sent successfully. We will contact you based on the information provided."
  },
  duplicate: {
    "zh-TW": "相同內容剛才已送出，請稍候一分鐘後再試。",
    en: "The same inquiry was just submitted. Please wait one minute before trying again."
  },
  timeout: {
    "zh-TW": "送出逾時，資料未確認送達。請檢查網路後再試，或改用 Email 聯絡。",
    en: "The request timed out and delivery could not be confirmed. Check your connection and try again, or contact us by email."
  },
  network: {
    "zh-TW": "目前無法連線至表單服務，請稍後重試或改用 Email 聯絡。",
    en: "The form service is currently unreachable. Please try again later or contact us by email."
  },
  rateLimit: {
    "zh-TW": "送出次數過多，請稍後再試。",
    en: "Too many submission attempts. Please try again later."
  },
  failed: {
    "zh-TW": "表單未能送出，請確認內容後再試，或改用 Email 聯絡。",
    en: "The form could not be sent. Check the information and try again, or contact us by email."
  }
};

function getCurrentLanguage() {
  return window.getCurrentLang ? window.getCurrentLang() : (document.documentElement.lang === "en" ? "en" : "zh-TW");
}

function getContactMessage(type) {
  const lang = getCurrentLanguage();
  return contactMessages[type]?.[lang] || contactMessages[type]?.["zh-TW"] || "";
}

function setStatus(type, message) {
  if (!contactFormStatus) return;
  contactFormStatus.textContent = message;
  contactFormStatus.className = `contact-form-status${type ? ` is-${type}` : ""}`;
}

function setSubmitting(pending) {
  isSubmitting = pending;
  if (!contactSubmitBtn) return;
  contactSubmitBtn.disabled = pending;
  contactSubmitBtn.classList.toggle("is-loading", pending);
  contactSubmitBtn.setAttribute("aria-busy", String(pending));
}

async function createSubmissionFingerprint(formData) {
  const stableFields = ["name", "company", "email", "phone", "service", "date", "message"];
  const content = stableFields.map((field) => String(formData.get(field) || "").trim()).join("\u241f");
  const bytes = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getRecentSubmission() {
  try {
    return JSON.parse(sessionStorage.getItem("sentrumContactSubmission") || "null");
  } catch {
    return null;
  }
}

function rememberSubmission(fingerprint) {
  try {
    sessionStorage.setItem("sentrumContactSubmission", JSON.stringify({ fingerprint, timestamp: Date.now() }));
  } catch {}
}

function updateFormMode() {
  if (!contactForm || !accessKeyInput) return;
  accessKeyInput.value = String(contactConfig.accessKey || "").trim();
  const configured = Boolean(accessKeyInput.value);
  contactForm.dataset.formMode = configured ? "live" : "setup-required";
  contactForm.dataset.setupLabel = getContactMessage("setup");
}

async function submitContactForm(event) {
  event.preventDefault();
  if (!contactForm || isSubmitting) return;

  if (!contactForm.checkValidity()) {
    contactForm.reportValidity();
    setStatus("error", getContactMessage("invalid"));
    return;
  }

  const formData = new FormData(contactForm);
  const configuredAccessKey = String(contactConfig.accessKey || "").trim();
  if (!configuredAccessKey) {
    setStatus("error", getContactMessage("unavailable"));
    return;
  }

  const minimumCompletionMs = Number(contactConfig.minimumCompletionMs) || 2500;
  if (formData.get("botcheck") || Date.now() - submissionStartedAt < minimumCompletionMs) {
    setStatus("success", getContactMessage("success"));
    return;
  }

  formData.set("access_key", configuredAccessKey);
  formData.delete("form_started_at");
  const fingerprint = await createSubmissionFingerprint(formData);
  const recent = getRecentSubmission();
  const duplicateWindowMs = Number(contactConfig.duplicateWindowMs) || 60000;
  if (recent?.fingerprint === fingerprint && Date.now() - recent.timestamp < duplicateWindowMs) {
    setStatus("error", getContactMessage("duplicate"));
    return;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), Number(contactConfig.timeoutMs) || 12000);
  setSubmitting(true);
  setStatus("info", getContactMessage("sending"));

  try {
    const response = await fetch(contactConfig.endpoint || contactForm.action, {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" },
      credentials: "omit",
      signal: controller.signal
    });
    const result = await response.json().catch(() => ({}));

    if (response.ok && result.success === true) {
      rememberSubmission(fingerprint);
      contactForm.reset();
      if (formStartedAt) formStartedAt.value = String(Date.now());
      setStatus("success", getContactMessage("success"));
      return;
    }

    setStatus("error", response.status === 429 ? getContactMessage("rateLimit") : getContactMessage("failed"));
  } catch (error) {
    setStatus("error", error?.name === "AbortError" ? getContactMessage("timeout") : getContactMessage("network"));
  } finally {
    window.clearTimeout(timeout);
    setSubmitting(false);
  }
}

if (formStartedAt) formStartedAt.value = String(submissionStartedAt);
window.addEventListener("sentrum:languagechange", updateFormMode);
updateFormMode();
contactForm?.addEventListener("submit", submitContactForm);
