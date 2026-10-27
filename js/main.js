function applyMediaDisclosures() {
  const lang = window.getCurrentLang ? window.getCurrentLang() : "zh-TW";
  const copy = lang === "en"
    ? "Technical workflow diagram for system communication; not a product hardware photo or a claimed customer project."
    : "系統技術流程圖，用於說明架構與訊號邏輯；非產品實機照片，也不代表已交付客戶案例。";

  document.querySelectorAll(".product-split__media, .concept-media").forEach((media) => {
    let note = media.querySelector(".media-disclosure");
    if (media.querySelector("img")) {
      note?.remove();
      return;
    }
    if (!note) {
      note = document.createElement("p");
      note.className = "media-disclosure";
      media.appendChild(note);
    }
    note.textContent = copy;
  });
}

function bindImageFallbacks() {
  document.querySelectorAll("img").forEach((image) => {
    image.addEventListener("error", () => {
      image.hidden = true;
      const parent = image.parentElement;
      if (parent && !parent.querySelector(".image-fallback")) {
        const fallback = document.createElement("span");
        fallback.className = "image-fallback";
        fallback.textContent = window.getCurrentLang?.() === "en" ? "Image unavailable" : "圖片暫未提供";
        parent.appendChild(fallback);
      }
    }, { once: true });
  });
}

function hardenExternalLinks() {
  document.querySelectorAll('a[target="_blank"]').forEach((link) => {
    link.rel = "noopener noreferrer";
  });
}

function initPageUtilities() {
  bindImageFallbacks();
  hardenExternalLinks();
  applyMediaDisclosures();
}

window.addEventListener("sentrum:languagechange", () => {
  applyMediaDisclosures();
});
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPageUtilities);
} else {
  initPageUtilities();
}
