// Označí, že běží JS – CSS pak smí skrývat .fade-in prvky (progressive enhancement)
document.documentElement.classList.add("js");

/* =========================
   Šablony (hlavička, patička, modal)
========================= */

function pathPrefix() {
  return window.location.pathname.includes("/stranky/") ? "../" : "";
}

function withPrefix(relativePath) {
  const p = pathPrefix();
  return `${p}${relativePath}`;
}

async function inject(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`);
  el.innerHTML = await res.text();
}

function setActiveNav() {
  const page = document.body?.dataset?.page; // "home" | "about" | ...
  if (!page) return;

  const active = document.querySelector(`a[data-nav="${page}"]`);
  if (active) active.classList.add("is-active");
}

function setFooterYear() {
  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();
}
function initMobileMenu() {
  const btn = document.querySelector(".menu-btn");
  const nav = document.querySelector("#main-nav");
  if (!btn || !nav) return;

  const isMobile = window.matchMedia("(max-width: 820px)").matches;

  nav.hidden = isMobile;                 // mobile: schovat, desktop: ukázat
  nav.classList.remove("is-open");
  btn.classList.remove("is-open");
  btn.setAttribute("aria-expanded", "false");

  if (btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  // Backdrop element (vytvoříme jen jednou)
  let backdrop = document.querySelector(".menu-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "menu-backdrop";
    document.body.appendChild(backdrop);
  }

  const openMenu = () => {
    btn.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");

    nav.hidden = false;            // ✅ skutečně zobrazíme
    // v dalším snímku přidáme class pro animaci
    requestAnimationFrame(() => nav.classList.add("is-open"));

    backdrop.classList.add("is-visible");
  };

  const closeMenu = () => {
    btn.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");

    nav.classList.remove("is-open");
    backdrop.classList.remove("is-visible");

    // po doběhnutí animace schovat úplně
    window.setTimeout(() => {
      // schovej jen pokud už není znovu otevřené
      if (!nav.classList.contains("is-open")) nav.hidden = true;
    }, 180);
  };

  const toggleMenu = () => {
    const isOpen = btn.getAttribute("aria-expanded") === "true";
    isOpen ? closeMenu() : openMenu();
  };

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMenu();
  });

  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeMenu();
  });

  // klik mimo / na backdrop
  backdrop.addEventListener("click", closeMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // když se přepne na desktop šířku, menu schovej (aby nezůstalo “viset”)
  const mq = window.matchMedia("(max-width: 820px)");
  mq.addEventListener("change", () => {
    if (!mq.matches) {
      // desktop – necháme nav “normálně”, ale zavřeme mobilní stavy
      nav.hidden = false;
      nav.classList.remove("is-open");
      backdrop.classList.remove("is-visible");
      btn.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    } else {
      // mobile – startujeme zavřené
      nav.hidden = true;
      nav.classList.remove("is-open");
      backdrop.classList.remove("is-visible");
      btn.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    }
  });

  // Start state (mobile zavřené)
  if (window.matchMedia("(max-width: 820px)").matches) {
    nav.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  } else {
    nav.hidden = false;
  }

  btn.disabled = false;
}


async function loadLayout() {
  const p = pathPrefix();
  await Promise.all([
    inject("#site-header", `${p}partials/header.html`),
    inject("#site-footer", `${p}partials/footer.html`),
    inject("#seller-modal-mount", `${p}partials/seller-modal.html`),
  ]);

  setFooterYear();
  initMobileMenu();
  setActiveNav();
}

/* =========================
   Fade-in
========================= */

function initFadeIn() {
  const els = document.querySelectorAll(".fade-in");
  if (!els.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  els.forEach((el) => observer.observe(el));
}

/* =========================
   Contact form
========================= */

function initContactForm() {
  const form = document.querySelector("#contact-form");
  const status = document.querySelector("#contact-status");
  if (!form || !status) return;

  // zabráníme dvojí inicializaci
  if (form.dataset.bound === "1") return;
  form.dataset.bound = "1";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = status.dataset.sendingText || "Odesílám…";

    // Pokud není action, jen “fake” odeslání (nezlomí web)
    const action = form.getAttribute("action");
    if (!action) {
      form.reset();
      status.textContent = "Díky! Zpráva je připravená k odeslání (doplníme odesílací službu).";
      return;
    }

    try {
      const formData = new FormData(form);
      const res = await fetch(action, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (!res.ok) throw new Error(`Submit failed (${res.status})`);

      form.reset();
      status.textContent = status.dataset.successText || "Děkujeme! Zpráva byla odeslána.";
    } catch (err) {
      console.error(err);
      status.textContent = status.dataset.errorText || "Odeslání se nepodařilo. Zkus to prosím později.";
    }
  });
}

/* =========================
   Detail prodejce (modal)

   Data nejsou v JS ani v JSON – jsou přímo v HTML ve skrytých blocích
   .prodejce-detail, které do stránky vygeneruje .claude/generuj-prodejce.ps1
   ze souboru obsah/sellers.json. Modal si z nich jen klonuje obsah.

   Fotky mají v HTML data-src (ne src), aby se stahovaly až při otevření
   detailu – jinak by skrytý blok stáhl fotky všech prodejců hned.
========================= */

const IKONA_WEB = `<svg viewBox="-1 0 19 19" fill="currentColor" aria-hidden="true"><path d="M16.417 9.57a7.917 7.917 0 1 1-8.144-7.908 1.758 1.758 0 0 1 .451 0 7.913 7.913 0 0 1 7.693 7.907zM5.85 15.838q.254.107.515.193a11.772 11.772 0 0 1-1.572-5.92h-3.08a6.816 6.816 0 0 0 4.137 5.727zM2.226 6.922a6.727 6.727 0 0 0-.511 2.082h3.078a11.83 11.83 0 0 1 1.55-5.89q-.249.083-.493.186a6.834 6.834 0 0 0-3.624 3.622zm8.87 2.082a14.405 14.405 0 0 0-.261-2.31 9.847 9.847 0 0 0-.713-2.26c-.447-.952-1.009-1.573-1.497-1.667a8.468 8.468 0 0 0-.253 0c-.488.094-1.05.715-1.497 1.668a9.847 9.847 0 0 0-.712 2.26 14.404 14.404 0 0 0-.261 2.309zm-.974 5.676a9.844 9.844 0 0 0 .713-2.26 14.413 14.413 0 0 0 .26-2.309H5.903a14.412 14.412 0 0 0 .261 2.31 9.844 9.844 0 0 0 .712 2.259c.487 1.036 1.109 1.68 1.624 1.68s1.137-.644 1.623-1.68zm4.652-2.462a6.737 6.737 0 0 0 .513-2.107h-3.082a11.77 11.77 0 0 1-1.572 5.922q.261-.086.517-.194a6.834 6.834 0 0 0 3.624-3.621zM11.15 3.3a6.82 6.82 0 0 0-.496-.187 11.828 11.828 0 0 1 1.55 5.89h3.081A6.815 6.815 0 0 0 11.15 3.3z"/></svg>`;

const IKONA_INSTAGRAM = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.34,5.46h0a1.2,1.2,0,1,0,1.2,1.2A1.2,1.2,0,0,0,17.34,5.46Zm4.6,2.42a7.59,7.59,0,0,0-.46-2.43,4.94,4.94,0,0,0-1.16-1.77,4.7,4.7,0,0,0-1.77-1.15,7.3,7.3,0,0,0-2.43-.47C15.06,2,14.72,2,12,2s-3.06,0-4.12.06a7.3,7.3,0,0,0-2.43.47A4.78,4.78,0,0,0,3.68,3.68,4.7,4.7,0,0,0,2.53,5.45a7.3,7.3,0,0,0-.47,2.43C2,8.94,2,9.28,2,12s0,3.06.06,4.12a7.3,7.3,0,0,0,.47,2.43,4.7,4.7,0,0,0,1.15,1.77,4.78,4.78,0,0,0,1.77,1.15,7.3,7.3,0,0,0,2.43.47C8.94,22,9.28,22,12,22s3.06,0,4.12-.06a7.3,7.3,0,0,0,2.43-.47,4.7,4.7,0,0,0,1.77-1.15,4.85,4.85,0,0,0,1.16-1.77,7.59,7.59,0,0,0,.46-2.43c0-1.06.06-1.4.06-4.12S22,8.94,21.94,7.88ZM20.14,16a5.61,5.61,0,0,1-.34,1.86,3.06,3.06,0,0,1-.75,1.15,3.19,3.19,0,0,1-1.15.75,5.61,5.61,0,0,1-1.86.34c-1,.05-1.37.06-4,.06s-3,0-4-.06A5.73,5.73,0,0,1,6.1,19.8,3.27,3.27,0,0,1,5,19.05a3,3,0,0,1-.74-1.15A5.54,5.54,0,0,1,3.86,16c0-1-.06-1.37-.06-4s0-3,.06-4A5.54,5.54,0,0,1,4.21,6.1,3,3,0,0,1,5,5,3.14,3.14,0,0,1,6.1,4.2,5.73,5.73,0,0,1,8,3.86c1,0,1.37-.06,4-.06s3,0,4,.06a5.61,5.61,0,0,1,1.86.34A3.06,3.06,0,0,1,19.05,5,3.06,3.06,0,0,1,19.8,6.1,5.61,5.61,0,0,1,20.14,8c.05,1,.06,1.37.06,4S20.19,15,20.14,16ZM12,6.87A5.13,5.13,0,1,0,17.14,12,5.12,5.12,0,0,0,12,6.87Zm0,8.46A3.33,3.33,0,1,1,15.33,12,3.33,3.33,0,0,1,12,15.33Z"/></svg>`;

function vytvorIkonuOdkazu(url, popis, social) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = "social-link";
  a.setAttribute("aria-label", popis);
  if (social) a.setAttribute("data-social", social);
  a.innerHTML = social === "instagram" ? IKONA_INSTAGRAM : IKONA_WEB;
  return a;
}

function openSellerModal(index) {
  const dlg = document.querySelector("#seller-modal");
  const titleEl = document.querySelector("#seller-modal-title");
  const metaEl = document.querySelector("#seller-modal-meta");
  const descEl = document.querySelector("#seller-modal-desc");
  const photosEl = document.querySelector("#seller-modal-photos");
  const actionsEl = document.querySelector("#seller-modal-actions");

  if (!dlg || !titleEl || !descEl || !photosEl || !actionsEl) return;

  const detail = document.querySelector(`.prodejce-detail[data-prodejce="${index}"]`);
  if (!detail) return;

  // název
  titleEl.textContent = detail.dataset.nazev || "";

  // meta
  const meta = detail.querySelector(".prodejce-detail__meta")?.textContent.trim() || "";
  metaEl.textContent = meta;
  metaEl.style.display = meta ? "" : "none";

  // popis
  const desc = detail.querySelector(".prodejce-detail__desc")?.textContent.trim() || "";
  descEl.textContent = desc;
  descEl.style.display = desc ? "" : "none";

  // fotky – v HTML jsou jen jako data-src, <img> vzniká až tady,
  // takže se stahují na vyžádání a ne u všech prodejců najednou
  photosEl.innerHTML = "";
  const fotky = detail.querySelectorAll(".prodejce-detail__photo");

  if (fotky.length) {
    photosEl.style.display = "";
    fotky.forEach((zdroj) => {
      if (!zdroj.dataset.src) return;

      const wrap = document.createElement("div");
      wrap.className = "seller-modal__photo-wrap";

      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = zdroj.dataset.src;
      img.alt = zdroj.dataset.alt || "";

      wrap.appendChild(img);
      photosEl.appendChild(wrap);
    });
  } else {
    photosEl.style.display = "none";
  }

  // odkazy (web + Instagram)
  actionsEl.innerHTML = "";
  actionsEl.style.display = "none";

  const actionsWrap = document.createElement("div");
  actionsWrap.className = "seller-actions";

  if (detail.dataset.web) {
    actionsWrap.appendChild(vytvorIkonuOdkazu(detail.dataset.web, "Web prodejce"));
  }
  if (detail.dataset.instagram) {
    actionsWrap.appendChild(vytvorIkonuOdkazu(detail.dataset.instagram, "Instagram", "instagram"));
  }

  if (actionsWrap.children.length > 0) {
    actionsEl.appendChild(actionsWrap);
    actionsEl.style.display = "";
  }

  dlg.showModal();
}

function closeSellerModal() {
  const dlg = document.querySelector("#seller-modal");
  if (dlg && dlg.open) dlg.close();
}

function initSellerModalControls() {
  const dlg = document.querySelector("#seller-modal");
  if (!dlg) return;

  if (dlg.dataset.bound === "1") return;
  dlg.dataset.bound = "1";

  dlg.querySelector(".seller-modal__close")?.addEventListener("click", closeSellerModal);

  // klik mimo obsah dialogu zavře (backdrop)
  dlg.addEventListener("click", (e) => {
    const rect = dlg.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!inside) closeSellerModal();
  });

  document.addEventListener("keydown", (e) => {
    if (!dlg.open) return;
    if (e.key === "Escape") closeSellerModal();
  });
}

// Karty prodejců jsou v HTML; JS jim jen navěsí otevření detailu.
// Bez JS zůstane seznam čitelný, jen bez modalu.
function initSellerCards() {
  const karty = document.querySelectorAll("[data-prodejce-karta]");
  if (!karty.length) return;

  karty.forEach((karta) => {
    karta.addEventListener("click", () => {
      openSellerModal(karta.dataset.prodejceKarta);
    });
  });

  initSellerModalControls();
}

/* =========================
   Galerie + Lightbox

   Fotky jsou přímo v HTML (galerie.html) jako <button class="gallery-item">.
========================= */

let galleryItems = [];
let galleryIndex = 0;

function openLightbox(index) {
  const dlg = document.querySelector("#lightbox");
  const img = document.querySelector("#lightbox-img");
  const cap = document.querySelector("#lightbox-caption");
  if (!dlg || !img) return;

  const btn = galleryItems[index];
  if (!btn) return;

  galleryIndex = index;
  const zdroj = btn.querySelector("img");

  img.src = btn.dataset.full || zdroj?.src || "";
  img.alt = zdroj?.alt || "";
  if (cap) cap.textContent = btn.dataset.caption || "";

  dlg.showModal();
}

function closeLightbox() {
  const dlg = document.querySelector("#lightbox");
  if (dlg && dlg.open) dlg.close();
}

function stepLightbox(dir) {
  if (!galleryItems.length) return;
  galleryIndex = (galleryIndex + dir + galleryItems.length) % galleryItems.length;
  openLightbox(galleryIndex);
}

function initLightboxControls() {
  const dlg = document.querySelector("#lightbox");
  if (!dlg) return;

  if (dlg.dataset.bound === "1") return;
  dlg.dataset.bound = "1";

  dlg.querySelector(".lightbox__close")?.addEventListener("click", closeLightbox);
  dlg.querySelector(".lightbox__nav--prev")?.addEventListener("click", () => stepLightbox(-1));
  dlg.querySelector(".lightbox__nav--next")?.addEventListener("click", () => stepLightbox(1));

  dlg.addEventListener("click", (e) => {
    const rect = dlg.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!inside) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (!dlg.open) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });
}

function initGallery() {
  const grid = document.querySelector("#gallery-grid");
  if (!grid) return;

  galleryItems = Array.from(grid.querySelectorAll(".gallery-item"));
  if (!galleryItems.length) return;

  galleryItems.forEach((btn, idx) => {
    btn.addEventListener("click", () => openLightbox(idx));
  });

  initLightboxControls();
}

/* =========================
   Odpočet do akce
========================= */

// +02:00 = letní čas, 17. 10. 2026 je ještě před koncem DST (25. 10.)
const EVENT_START = new Date("2026-10-17T10:00:00+02:00");
const EVENT_END = new Date("2026-10-17T18:00:00+02:00");

// České skloňování: 1 den, 2–4 dny, 0 a 5+ dní
function plural(n, one, few, many) {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

function initCountdown() {
  const wrap = document.querySelector("#countdown");
  if (!wrap) return;

  const el = {
    days: document.querySelector("#cd-days"),
    hours: document.querySelector("#cd-hours"),
    minutes: document.querySelector("#cd-minutes"),
    seconds: document.querySelector("#cd-seconds"),
    daysLabel: document.querySelector("#cd-days-label"),
    hoursLabel: document.querySelector("#cd-hours-label"),
    minutesLabel: document.querySelector("#cd-minutes-label"),
    secondsLabel: document.querySelector("#cd-seconds-label"),
    note: document.querySelector("#countdown-note"),
    title: document.querySelector("#countdown-label"),
  };
  if (!el.days) return;

  // Zpráva místo odpočtu (během akce / po akci)
  const showMessage = (text) => {
    wrap.hidden = true;
    if (el.title) el.title.hidden = true;
    if (el.note) {
      el.note.hidden = false;
      el.note.textContent = text;
    }
  };

  const tick = () => {
    const now = Date.now();
    const start = EVENT_START.getTime();
    const end = EVENT_END.getTime();

    // Akce už skončila
    if (now >= end) {
      showMessage("Festival PapírPOINT proběhl 17. října 2026. Děkujeme všem, kdo dorazili!");
      return true; // hotovo, můžeme zastavit
    }

    // Akce právě probíhá
    if (now >= start) {
      showMessage("Festival právě probíhá! Přijď za námi na Pevnost poznání, otevřeno je do 18:00.");
      return false;
    }

    // Odpočet – datum a místo jsou hned nad ním, poznámku tu nepotřebujeme
    wrap.hidden = false;
    if (el.title) el.title.hidden = false;
    if (el.note) el.note.hidden = true;

    let zbyva = Math.floor((start - now) / 1000);
    const dny = Math.floor(zbyva / 86400); zbyva -= dny * 86400;
    const hodiny = Math.floor(zbyva / 3600); zbyva -= hodiny * 3600;
    const minuty = Math.floor(zbyva / 60);
    const sekundy = zbyva - minuty * 60;

    el.days.textContent = dny;
    el.hours.textContent = String(hodiny).padStart(2, "0");
    el.minutes.textContent = String(minuty).padStart(2, "0");
    el.seconds.textContent = String(sekundy).padStart(2, "0");

    if (el.daysLabel) el.daysLabel.textContent = plural(dny, "den", "dny", "dní");
    if (el.hoursLabel) el.hoursLabel.textContent = plural(hodiny, "hodina", "hodiny", "hodin");
    if (el.minutesLabel) el.minutesLabel.textContent = plural(minuty, "minuta", "minuty", "minut");
    if (el.secondsLabel) el.secondsLabel.textContent = plural(sekundy, "sekunda", "sekundy", "sekund");

    return false;
  };

  if (tick()) return; // akce už skončila, nemá smysl tikat
  const timer = window.setInterval(() => {
    if (tick()) window.clearInterval(timer);
  }, 1000);
}

/* =========================
   Co tě čeká – náhodná trojice prodejců

   V HTML jsou kartičky všech prodejců, první tři viditelné a zbytek hidden.
   JS jen prohodí, která trojice je vidět – bez JS uvidíš první tři.
========================= */

// Fisher–Yates, pracuje na kopii
function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const POCET_NAHLEDU = 3;

function initFeaturedSellers() {
  const grid = document.querySelector("#featured-sellers");
  if (!grid) return;

  const karty = Array.from(grid.children);
  if (karty.length <= POCET_NAHLEDU) return; // není z čeho losovat

  const vybrane = new Set(
    shuffle(karty.map((_, i) => i)).slice(0, POCET_NAHLEDU)
  );

  karty.forEach((karta, i) => {
    karta.hidden = !vybrane.has(i);
  });
}

/* =========================
   Souhlas s načtením mapy
   Web sám žádné cookies nenastavuje ani neměří návštěvnost.
   Souhlas se týká výhradně vložené mapy od Googlu na stránce Kontakt.
========================= */

const MAP_CONSENT_KEY = "pp_map_consent_v1"; // hodnota: "granted"

function getMapConsent() {
  try { return localStorage.getItem(MAP_CONSENT_KEY); } catch { return null; }
}

function setMapConsent(value) {
  try { localStorage.setItem(MAP_CONSENT_KEY, value); } catch {}
}

function loadMapNow() {
  const wrap = document.querySelector("#map-consent");
  const tpl = document.querySelector("#map-iframe-template");
  if (!wrap || !tpl) return;

  // když už je iframe vložený, nic nedělej
  if (wrap.dataset.loaded === "1") return;
  wrap.dataset.loaded = "1";

  wrap.replaceWith(tpl.content.cloneNode(true));
}

function initMapConsent() {
  const wrap = document.querySelector("#map-consent");
  if (!wrap) return; // nejsme na stránce s mapou

  // souhlas z dřívější návštěvy
  if (getMapConsent() === "granted") {
    loadMapNow();
    return;
  }

  const btn = document.querySelector("#map-consent-btn");
  if (!btn || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  btn.addEventListener("click", () => {
    setMapConsent("granted");
    loadMapNow();
  });
}


/* =========================
   Single init (ONLY ONCE)
========================= */

async function initSite() {
  // co nepotřebuje hlavičku ani patičku, rozjedeme hned
  initMapConsent();
  initCountdown();
  initFeaturedSellers();
  initGallery();
  initContactForm();
  initFadeIn();

  // modal se vkládá z partials, takže karty prodejců až potom
  await loadLayout();
  initSellerCards();
}

initSite().catch(console.error);
