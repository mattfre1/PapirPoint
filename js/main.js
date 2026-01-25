/* =========================
   Helpers: paths + layout
========================= */

function pathPrefix() {
  // Pokud jsi na /pages/..., potřebuješ o úroveň výš
  return window.location.pathname.includes("/pages/") ? "../" : "";
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
   Sellers
========================= */

let sellersItems = [];
let sellersIndex = 0;

function openSellerModal(index) {
  const dlg = document.querySelector("#seller-modal");
  const titleEl = document.querySelector("#seller-modal-title");
  const metaEl = document.querySelector("#seller-modal-meta");
  const descEl = document.querySelector("#seller-modal-desc");
  const photosEl = document.querySelector("#seller-modal-photos");
  const actionsEl = document.querySelector("#seller-modal-actions");
  if (!dlg || !titleEl || !descEl || !photosEl || !actionsEl) return;

  sellersIndex = index;
  const item = sellersItems[sellersIndex];
  if (!item) return;

  titleEl.textContent = item.name || "";

  // meta
  metaEl.textContent = item.meta || "";
  metaEl.style.display = item.meta ? "" : "none";

  // popis
  descEl.textContent = item.description || "";
  descEl.style.display = item.description ? "" : "none";

  // fotky (max 3)
  photosEl.innerHTML = "";
  const photos = Array.isArray(item.photos) ? item.photos.slice(0, 3) : [];

  if (photos.length) {
    photosEl.style.display = "";
    photos.forEach((p, i) => {
      if (!p?.src) return;
      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = withPrefix(p.src);
      img.alt = p.alt || `${item.name} – fotka ${i + 1}`;
      photosEl.appendChild(img);
    });
  } else {
    photosEl.style.display = "none";
  }

  // akce (nový formát: item.link; fallback: item.url)
  actionsEl.innerHTML = "";
  actionsEl.style.display = "none"; // default: schovat, pokud nemáme žádnou akci
  const link = item.link || null;

  // fallback pro starý formát, kdyby někde ještě byl item.url
  const legacyUrl = typeof item.url === "string" && item.url.trim().length ? item.url.trim() : "";

  const type = link?.type || (legacyUrl ? "web" : "none");
  const url =
    (typeof link?.url === "string" && link.url.trim().length ? link.url.trim() : "") ||
    legacyUrl;

  const customLabel = typeof link?.label === "string" ? link.label.trim() : "";

  if (type !== "none" && url) {
    const a = document.createElement("a");
    a.className = "btn btn--secondary";
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    actionsEl.appendChild(a);
    actionsEl.style.display = "";   // máme akci → ukaž lištu

    if (customLabel) {
      a.textContent = customLabel;
    } else {
      a.textContent = type === "social" ? "Otevřít sociální sítě" : "Otevřít web prodejce";
    }

    actionsEl.appendChild(a);
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

function createSellerCard(item, index) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "grid-item";
  el.setAttribute("aria-label", `Detail: ${item.name}`);
  el.dataset.index = String(index);

  const img = document.createElement("img");
  img.className = "grid-item__logo";
  img.alt = item.logoAlt || `${item.name} logo`;
  img.loading = "lazy";
  img.src = withPrefix(item.logo);

  const textWrap = document.createElement("div");
  textWrap.className = "grid-item__text";

  const title = document.createElement("h2");
  title.className = "grid-item__title";
  title.textContent = item.name;

  const meta = document.createElement("p");
  meta.className = "grid-item__meta";
  meta.textContent = item.meta || "";

  textWrap.appendChild(title);
  if (item.meta) textWrap.appendChild(meta);

  el.appendChild(img);
  el.appendChild(textWrap);

  el.addEventListener("click", () => openSellerModal(index));
  return el;
}

async function renderSellersFromJson() {
  const grid = document.querySelector("#sellers-grid");
  if (!grid) return; // nejsme na stránce sellers

  const titleEl = document.querySelector("#sellers-title");
  const introEl = document.querySelector("#sellers-intro");

  try {
    const res = await fetch(withPrefix("content/sellers.json"));
    if (!res.ok) throw new Error(`Fetch sellers.json failed (${res.status})`);
    const data = await res.json();

    if (titleEl && data.title) titleEl.textContent = data.title;
    if (introEl && data.intro) introEl.textContent = data.intro;

    const items = Array.isArray(data.items) ? data.items : [];
    sellersItems = items;

    grid.innerHTML = "";
    items.forEach((item, idx) => {
      if (!item || !item.name || !item.logo) return;
      grid.appendChild(createSellerCard(item, idx));
    });

    if (items.length === 0 && introEl) introEl.textContent = "Zatím tu nejsou žádní prodejci.";

    initSellerModalControls();
  } catch (err) {
    console.error(err);
    if (introEl) introEl.textContent = "Prodejce se nepodařilo načíst.";
  }
}

/* =========================
   Sponsors
========================= */

function createSponsorCard(item) {
  const hasUrl = !!item.url;
  const el = document.createElement(hasUrl ? "a" : "div");
  el.className = "grid-item";
  if (!hasUrl) el.classList.add("grid-item--static");

  el.dataset.type = "sponsor";  

  if (hasUrl) {
    el.href = item.url;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
    el.setAttribute("aria-label", `${item.name} (otevřít web)`);
  } else {
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", item.name);
  }

  const img = document.createElement("img");
  img.className = "grid-item__logo";
  img.alt = item.logoAlt || `${item.name} logo`;
  img.loading = "lazy";
  img.src = withPrefix(item.logo);

  const textWrap = document.createElement("div");
  textWrap.className = "grid-item__text";

  const title = document.createElement("h2");
  title.className = "grid-item__title";
  title.textContent = item.name;

  const meta = document.createElement("p");
  meta.className = "grid-item__meta";
  meta.textContent = item.meta || "";

  textWrap.appendChild(title);
  if (item.meta) textWrap.appendChild(meta);

  el.appendChild(img);
  el.appendChild(textWrap);

  return el;
}

async function renderSponsorsFromJson() {
  const grid = document.querySelector("#sponsors-grid");
  if (!grid) return; // nejsme na stránce sponzorů

  const titleEl = document.querySelector("#sponsors-title");
  const introEl = document.querySelector("#sponsors-intro");

  try {
    const res = await fetch(withPrefix("content/sponsors.json"));
    if (!res.ok) throw new Error(`Fetch sponsors.json failed (${res.status})`);
    const data = await res.json();

    if (titleEl && data.title) titleEl.textContent = data.title;
    if (introEl && data.intro) introEl.textContent = data.intro;

    grid.innerHTML = "";
    const items = Array.isArray(data.items) ? data.items : [];

    for (const item of items) {
      if (!item || !item.name || !item.logo) continue;
      grid.appendChild(createSponsorCard(item));
    }

    if (items.length === 0 && introEl) introEl.textContent = "Zatím tu nejsou žádní sponzoři.";
  } catch (err) {
    console.error(err);
    if (introEl) introEl.textContent = "Sponzory se nepodařilo načíst.";
  }
}

/* =========================
   Gallery + Lightbox
========================= */

let galleryItems = [];
let galleryIndex = 0;

function openLightbox(index) {
  const dlg = document.querySelector("#lightbox");
  const img = document.querySelector("#lightbox-img");
  const cap = document.querySelector("#lightbox-caption");
  if (!dlg || !img) return;

  galleryIndex = index;
  const item = galleryItems[galleryIndex];

  img.src = withPrefix(item.src);
  img.alt = item.alt || "";
  if (cap) cap.textContent = item.caption || "";

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

async function renderGalleryFromJson() {
  const grid = document.querySelector("#gallery-grid");
  if (!grid) return;

  const titleEl = document.querySelector("#gallery-title");
  const introEl = document.querySelector("#gallery-intro");

  try {
    const res = await fetch(withPrefix("content/gallery.json"));
    if (!res.ok) throw new Error(`Fetch gallery.json failed (${res.status})`);
    const data = await res.json();

    if (titleEl && data.title) titleEl.textContent = data.title;
    if (introEl && data.intro) introEl.textContent = data.intro;

    const items = Array.isArray(data.items) ? data.items : [];
    galleryItems = items.filter((x) => x && x.src);

    grid.innerHTML = "";

    galleryItems.forEach((item, idx) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "gallery-item";
      card.setAttribute("aria-label", item.caption || item.alt || `Fotka ${idx + 1}`);

      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = withPrefix(item.src);
      img.alt = item.alt || "";

      card.appendChild(img);
      card.addEventListener("click", () => openLightbox(idx));
      grid.appendChild(card);
    });

    if (galleryItems.length === 0 && introEl) introEl.textContent = "Galerie je zatím prázdná.";

    initLightboxControls();
  } catch (err) {
    console.error(err);
    if (introEl) introEl.textContent = "Galerii se nepodařilo načíst.";
  }
}

/* =========================
   Social (page) + optional lightbox
========================= */

let socialItems = [];
let socialIndex = 0;

function openSocialLightbox(index) {
  const dlg = document.querySelector("#social-lightbox");
  const img = document.querySelector("#social-lightbox-img");
  const cap = document.querySelector("#social-lightbox-caption");
  const actions = document.querySelector("#social-lightbox-actions");
  if (!dlg || !img) return;

  socialIndex = index;
  const item = socialItems[socialIndex];

  img.src = withPrefix(item.src);
  img.alt = item.alt || "";
  if (cap) cap.textContent = item.caption || "";

  if (actions) {
    actions.innerHTML = "";
    if (item.url) {
      const a = document.createElement("a");
      a.className = "btn btn--secondary";
      a.href = item.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Otevřít příspěvek";
      actions.appendChild(a);
    }
  }

  dlg.showModal();
}

function closeSocialLightbox() {
  const dlg = document.querySelector("#social-lightbox");
  if (dlg && dlg.open) dlg.close();
}

function stepSocial(dir) {
  if (!socialItems.length) return;
  socialIndex = (socialIndex + dir + socialItems.length) % socialItems.length;
  openSocialLightbox(socialIndex);
}

function initSocialLightboxControls() {
  const dlg = document.querySelector("#social-lightbox");
  if (!dlg) return;

  if (dlg.dataset.bound === "1") return;
  dlg.dataset.bound = "1";

  dlg.querySelector(".lightbox__close")?.addEventListener("click", closeSocialLightbox);
  dlg.querySelector(".lightbox__nav--prev")?.addEventListener("click", () => stepSocial(-1));
  dlg.querySelector(".lightbox__nav--next")?.addEventListener("click", () => stepSocial(1));

  dlg.addEventListener("click", (e) => {
    const rect = dlg.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!inside) closeSocialLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (!dlg.open) return;
    if (e.key === "Escape") closeSocialLightbox();
    if (e.key === "ArrowLeft") stepSocial(-1);
    if (e.key === "ArrowRight") stepSocial(1);
  });
}

async function renderSocialFromJson() {
  const grid = document.querySelector("#social-grid");
  if (!grid) return;

  const titleEl = document.querySelector("#social-title");
  const introEl = document.querySelector("#social-intro");

  try {
    const res = await fetch(withPrefix("content/social.json"));
    if (!res.ok) throw new Error(`Fetch social.json failed (${res.status})`);
    const data = await res.json();

    if (titleEl && data.title) titleEl.textContent = data.title;
    if (introEl && data.intro) introEl.textContent = data.intro;

    const items = Array.isArray(data.items) ? data.items : [];
    const safeItems = items.filter((x) => x && x.src && x.url);

    socialItems = safeItems;
    grid.innerHTML = "";

    safeItems.forEach((item, idx) => {
      // pokud máš social lightbox, můžeš místo <a> použít <button> a otevřít lightbox
      const a = document.createElement("a");
      a.className = "social-item";
      a.href = item.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.setAttribute("aria-label", item.alt || "Otevřít příspěvek");

      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = withPrefix(item.src);
      img.alt = item.alt || "";

      a.appendChild(img);
      grid.appendChild(a);

      // Když chceš lightbox pro social, odkomentuj:
      // a.addEventListener("click", (e) => { e.preventDefault(); openSocialLightbox(idx); });
    });

    if (safeItems.length === 0 && introEl) introEl.textContent = "Zatím tu nejsou žádné příspěvky.";

    initSocialLightboxControls();
  } catch (err) {
    console.error(err);
    if (introEl) introEl.textContent = "Příspěvky se nepodařilo načíst.";
  }
}

/* =========================
   Homepage blocks (content/home.json)
========================= */

function createHomeSponsorCard(item) {
  const a = document.createElement("a");
  a.className = "sponsor-card";
  a.href = item.url || "#";

  if (item.url) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }

  a.setAttribute("aria-label", item.name || "Sponzor");

  const img = document.createElement("img");
  img.src = withPrefix(item.logo);
  img.alt = item.logoAlt || item.name || "Sponzor";
  img.loading = "lazy";

  a.appendChild(img);
  return a;
}

function createHomeSocialItem(item, idx = 0) {
  const a = document.createElement("a");

  const platform = (item.platform || "").toLowerCase();
  a.className = "social-item" + (platform === "instagram" ? " social-item--ig" : "");

  a.href = item.url || "#";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.setAttribute("aria-label", (item.caption || "Příspěvek") + " (otevřít)");

  const img = document.createElement("img");
  img.src = withPrefix(item.image);
  img.alt = item.caption || "Příspěvek";
  img.loading = idx < 3 ? "eager" : "lazy";
  img.decoding = "async";
  a.appendChild(img);
  if (idx < 1) img.fetchPriority = "high"; // jen úplně první

  return a;
}


async function renderHomeFromJson() {
  const heroDescEl = document.querySelector("#home-hero-desc");
  const aboutEl = document.querySelector("#home-about-text");
  const aboutLongEl = document.querySelector("#home-about-long");
  const sponsorsGrid = document.querySelector("#home-sponsors-grid");
  const socialGrid = document.querySelector("#home-social-grid");
  const socialIntro = document.querySelector("#social-intro");

  // nejsme na homepage
  if (!heroDescEl && !aboutEl && !aboutLongEl && !sponsorsGrid && !socialGrid) return;

  try {
    const res = await fetch(withPrefix("content/home.json"));
    if (!res.ok) throw new Error(`Fetch home.json failed (${res.status})`);
    const data = await res.json();

    if (heroDescEl && typeof data.heroDesc === "string") heroDescEl.textContent = data.heroDesc;
    if (aboutEl && typeof data.aboutTeaser === "string") aboutEl.textContent = data.aboutTeaser;

    if (aboutLongEl) {
      if (typeof data.aboutLong === "string" && data.aboutLong.trim().length) {
        aboutLongEl.textContent = data.aboutLong;
        aboutLongEl.style.display = "";
      } else {
        aboutLongEl.textContent = "";
        aboutLongEl.style.display = "none";
      }
    }

    if (sponsorsGrid) {
      sponsorsGrid.innerHTML = "";
      const featured = Array.isArray(data.featuredSponsors) ? data.featuredSponsors : [];
      featured.forEach((item) => {
        if (!item || !item.logo) return;
        sponsorsGrid.appendChild(createHomeSponsorCard(item));
      });
    }

    if (socialGrid) {
      socialGrid.innerHTML = "";
      const featured = Array.isArray(data.featuredSocial) ? data.featuredSocial : [];
      featured.forEach((item, idx) => {
        if (!item || !item.image || !item.url) return;
      socialGrid.appendChild(createHomeSocialItem(item, idx));
      });

      if (socialIntro) {
        socialIntro.textContent = featured.length
          ? "Vybrané příspěvky (kliknutím otevřeš originál)."
          : "Zatím tu nejsou žádné příspěvky.";
      }
    }
  } catch (err) {
    console.error(err);
    if (socialIntro) socialIntro.textContent = "Nepodařilo se načíst obsah homepage.";
  }
}

async function renderAboutFromJson() {
  // když nejsme na about stránce, nic nedělej
  const titleEl = document.querySelector("#about-title");
  const introEl = document.querySelector("#about-intro");
  const container = document.querySelector("#about-sections");
  const fallbackSection1 = document.querySelector("#about-h2-1"); // pokud jedeš “pevná IDčka”

  // podporujeme 2 varianty:
  // 1) dynamické sekce do #about-sections
  // 2) fallback na pevná IDčka (h2/p1/p2…)
  const hasDynamic = !!container;
  const hasStatic = !!titleEl || !!introEl || !!fallbackSection1;

  if (!hasDynamic && !hasStatic) return;

  try {
    const res = await fetch(withPrefix("content/about.json"));
    if (!res.ok) throw new Error(`Fetch about.json failed (${res.status})`);
    const data = await res.json();

    if (titleEl && data.title) titleEl.textContent = data.title;
    if (introEl && data.intro) introEl.textContent = data.intro;

    // Varianta 1: dynamický render do #about-sections
    if (container) {
      container.innerHTML = "";
      const sections = Array.isArray(data.sections) ? data.sections : [];

      sections.forEach((sec) => {
        if (!sec) return;

        const sectionEl = document.createElement("section");
        sectionEl.className = "section fade-in";

        if (sec.heading) {
          const h2 = document.createElement("h2");
          h2.textContent = sec.heading;
          sectionEl.appendChild(h2);
        }

        // odstavce
        const paragraphs = Array.isArray(sec.paragraphs) ? sec.paragraphs : [];
        paragraphs.forEach((p) => {
          const text = typeof p === "string" ? p : p?.text;
          if (!text) return;

          const para = document.createElement("p");
          para.textContent = text;
          sectionEl.appendChild(para);
        });

        // ✅ ODRÁŽKY (VOLITELNÉ)
        const bullets = Array.isArray(sec.bullets) ? sec.bullets : [];
        const safeBullets = bullets
          .map((b) => (typeof b === "string" ? b : b?.text))
          .filter((t) => typeof t === "string" && t.trim().length);

        if (safeBullets.length) {
          const ul = document.createElement("ul");
          ul.className = "about-list";

          safeBullets.forEach((text) => {
            const li = document.createElement("li");
            li.textContent = text;
            ul.appendChild(li);
          });

          sectionEl.appendChild(ul);
        }

        container.appendChild(sectionEl);
      });
    } else {
      // Varianta 2: pevná IDčka (volitelné)
      const sections = Array.isArray(data.sections) ? data.sections : [];

      const setText = (id, text) => {
        const el = document.querySelector(id);
        if (!el) return;
        el.textContent = text || "";
        if (!text) el.style.display = "none";
      };

      setText("#about-h2-1", sections[0]?.heading);
      setText("#about-p-1", sections[0]?.paragraphs?.[0]?.text ?? sections[0]?.paragraphs?.[0]);
      setText("#about-p-2", sections[0]?.paragraphs?.[1]?.text ?? sections[0]?.paragraphs?.[1]);

      setText("#about-h2-2", sections[1]?.heading);
      setText("#about-p-3", sections[1]?.paragraphs?.[0]?.text ?? sections[1]?.paragraphs?.[0]);
      setText("#about-p-4", sections[1]?.paragraphs?.[1]?.text ?? sections[1]?.paragraphs?.[1]);

      // ODRÁŽKY u statické varianty:
      // Aby šly vykreslit i tady, musel bys mít v HTML např. <ul id="about-ul-1"></ul>, <ul id="about-ul-2"></ul>
      // Když je nemáš, nic se neděje (žádná chyba).
    }
  } catch (err) {
    console.error(err);
    if (titleEl) titleEl.textContent = "O projektu";
    if (introEl) introEl.textContent = "Obsah se nepodařilo načíst.";
  }
}


async function renderContactsFromJson() {
  const titleEl = document.querySelector("#contacts-title");
  const introEl = document.querySelector("#contacts-intro");

  // když nejsme na kontakt stránce, pryč
  if (!titleEl && !introEl) return;

  const addressLabelEl = document.querySelector("#contacts-address-label");
  const addressEl = document.querySelector("#contacts-address");

  const emailLabelEl = document.querySelector("#contacts-email-label");
  const emailEl = document.querySelector("#contacts-email");

  const phoneLabelEl = document.querySelector("#contacts-phone-label");
  const phoneEl = document.querySelector("#contacts-phone");

  const socialLabelEl = document.querySelector("#contacts-social-label");
  const socialsEl = document.querySelector("#contacts-socials");

  const formTitleEl = document.querySelector("#contacts-form-title");
  const formNoteEl = document.querySelector("#contacts-form-note");

  const mapTitleEl = document.querySelector("#contacts-map-title");
  const mapEl = document.querySelector("#contacts-map");
  const mapNoteEl = document.querySelector("#contacts-map-note");

  try {
    const res = await fetch(withPrefix("content/contacts.json"));
    if (!res.ok) throw new Error(`Fetch contacts.json failed (${res.status})`);
    const data = await res.json();

    if (titleEl && data.title) titleEl.textContent = data.title;
    if (introEl && data.intro) introEl.textContent = data.intro;

    // LEFT
    const left = data.left || {};

    if (addressLabelEl) addressLabelEl.textContent = left.addressLabel || "";
    if (addressEl) {
      addressEl.innerHTML = "";
      const lines = Array.isArray(left.addressLines) ? left.addressLines : [];
      lines.forEach((line) => {
        const t = typeof line === "string" ? line : line?.text;
        if (!t) return;
        const div = document.createElement("div");
        div.textContent = t;
        addressEl.appendChild(div);
      });
    }

    if (emailLabelEl) emailLabelEl.textContent = left.emailLabel || "";
    if (emailEl) {
      const email = left.email || "";
      emailEl.textContent = email;
      emailEl.href = email ? `mailto:${email}` : "#";
      if (!email) emailEl.style.display = "none";
    }

    if (phoneLabelEl) phoneLabelEl.textContent = left.phoneLabel || "";
    if (phoneEl) {
      const phone = left.phone || "";
      phoneEl.textContent = phone;
      phoneEl.href = phone ? `tel:${String(phone).replace(/\s+/g, "")}` : "#";
      if (!phone) phoneEl.style.display = "none";
    }

  if (socialLabelEl) socialLabelEl.textContent = left.socialLabel || "";

  const socials = Array.isArray(left.socials) ? left.socials : [];

  const findByLabel = (label) =>
    socials.find((s) => (s?.label || "").trim().toLowerCase() === label);

  const ig = findByLabel("instagram");
  const fb = findByLabel("facebook");
  const tt = findByLabel("tiktok");

  // 1) Preferujeme ikonky v HTML (když existují)
  const igA = document.querySelector("#contacts-social-instagram");
  const fbA = document.querySelector("#contacts-social-facebook");
  const ttA = document.querySelector("#contacts-social-tiktok");

  const hasIconSet = !!(igA || fbA || ttA);

  if (hasIconSet) {
    if (igA) {
      if (ig?.url) { igA.href = ig.url; igA.style.display = ""; }
      else { igA.style.display = "none"; }
    }
    if (fbA) {
      if (fb?.url) { fbA.href = fb.url; fbA.style.display = ""; }
      else { fbA.style.display = "none"; }
    }
    if (ttA) {
      if (tt?.url) { ttA.href = tt.url; ttA.style.display = ""; }
      else { ttA.style.display = "none"; }
    }

    // Pokud máš starý <ul id="contacts-socials"> z minula, klidně ho schovej
    if (socialsEl) socialsEl.style.display = "none";
  } else {
    // 2) Fallback: textový seznam (původní chování)
    if (socialsEl) {
      socialsEl.style.display = "";
      socialsEl.innerHTML = "";

      socials.forEach((s) => {
        if (!s || !s.url) return;

        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = s.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = s.label || s.url;

        li.appendChild(a);
        socialsEl.appendChild(li);
      });

      if (!socials.length) socialsEl.style.display = "none";
    }
  }


    // FORM TEXTS
    const form = data.form || {};
    if (formTitleEl) formTitleEl.textContent = form.title || "";
    if (formNoteEl) formNoteEl.textContent = form.note || "";

    // Uložíme texty pro initContactForm (volitelně)
    // Pokud chceš, můžeš si je vyčíst v initContactForm z datasetu.
    const status = document.querySelector("#contact-status");
    if (status) {
      status.dataset.successText = form.successText || "";
      status.dataset.errorText = form.errorText || "";
    }

    // MAP
    const map = data.map || {};
    if (mapTitleEl) mapTitleEl.textContent = map.title || "";
    if (mapEl) {
      const src = map.iframeSrc || "";
      if (src) {
        mapEl.src = src;
        mapEl.style.display = "";
      } else {
        mapEl.removeAttribute("src");
        mapEl.style.display = "none";
      }
    }
    if (mapNoteEl) mapNoteEl.textContent = map.note || "";

  } catch (err) {
    console.error(err);
    if (introEl) introEl.textContent = "Kontakty se nepodařilo načíst.";
  }
}



/* =========================
   Single init (ONLY ONCE)
========================= */

async function initSite() {
  await loadLayout();

  // ✅ ať se stránka odhalí hned
  initFadeIn();

  // ✅ nenecháme render blokovat zobrazení
  Promise.allSettled([
    renderHomeFromJson(),
    renderAboutFromJson(),
    renderSellersFromJson(),
    renderSponsorsFromJson(),
    renderGalleryFromJson(),
    renderSocialFromJson(),
    renderContactsFromJson(),
  ]).then(() => {
    // ✅ po doplnění dynamických sekcí znovu napoj observer
    initFadeIn();
  });

  initContactForm();
}

initSite().catch(console.error);
