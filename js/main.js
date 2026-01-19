function pathPrefix() {
  // Pokud jsi na /pages/..., potřebuješ o úroveň výš
  return window.location.pathname.includes("/pages/") ? "../" : "";
}

async function inject(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`);

  el.innerHTML = await res.text();
}

function initMobileMenu() {
  const btn = document.querySelector(".menu-btn");
  const nav = document.querySelector("#main-nav");
  if (!btn || !nav) return;

  const close = () => {
    nav.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
  };

  btn.addEventListener("click", () => {
    const isOpen = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!isOpen));
    nav.classList.toggle("is-open", !isOpen);
  });

  // Zavři menu po kliknutí na odkaz
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) close();
  });

  // Zavři menu klikem mimo
  document.addEventListener("click", (e) => {
    if (!nav.classList.contains("is-open")) return;
    const clickInside = nav.contains(e.target) || btn.contains(e.target);
    if (!clickInside) close();
  });

  // Když se přepne na desktop šířku, menu zavři (ať nezůstane otevřené)
  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 821px)").matches) close();
  });
}

function setActiveNav() {
  const page = document.body.dataset.page; // "home" | "about" | ...
  if (!page) return;

  const active = document.querySelector(`a[data-nav="${page}"]`);
  if (active) active.classList.add("is-active");
}

function setFooterYear() {
  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();
}

async function loadLayout() {
  const p = pathPrefix();

  await inject("#site-header", `${p}partials/header.html`);
  await inject("#site-footer", `${p}partials/footer.html`);

  setFooterYear();
  initMobileMenu();
  setActiveNav();
}

loadLayout().catch(console.error);

function withPrefix(relativePath) {
  const p = pathPrefix();
  // relativePath očekáváme jako "img/..." nebo "content/..."
  return `${p}${relativePath}`;
}


function createSellerCard(item) {
  const hasUrl = typeof item.url === "string" && item.url.trim().length > 0;

  const el = document.createElement(hasUrl ? "a" : "div");
  el.className = "grid-item";

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

async function renderSellersFromJson() {
  const grid = document.querySelector("#sellers-grid");
  if (!grid) return; // nejsme na stránce prodejců

  const titleEl = document.querySelector("#sellers-title");
  const introEl = document.querySelector("#sellers-intro");

  try {
    const res = await fetch(withPrefix("content/sellers.json"));
    if (!res.ok) throw new Error(`Fetch sellers.json failed (${res.status})`);
    const data = await res.json();

    if (titleEl && data.title) titleEl.textContent = data.title;
    if (introEl && data.intro) introEl.textContent = data.intro;

    grid.innerHTML = "";
    const items = Array.isArray(data.items) ? data.items : [];

    for (const item of items) {
      // minimální validace
      if (!item || !item.name || !item.logo) continue;
      grid.appendChild(createSellerCard(item));
    }

    if (items.length === 0 && introEl) {
      introEl.textContent = "Zatím tu nejsou žádní prodejci.";
    }
  } catch (err) {
    console.error(err);
    if (introEl) introEl.textContent = "Prodejce se nepodařilo načíst.";
  }
}

loadLayout()
  .then(renderSellersFromJson)
  .catch(console.error);

  function createSponsorCard(item) {
  const hasUrl = typeof item.url === "string" && item.url.trim().length > 0;

  const el = document.createElement(hasUrl ? "a" : "div");
  el.className = "grid-item";

  if (hasUrl) {
    el.href = item.url;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
    el.setAttribute("aria-label", `${item.name} (otevřít web)`);

    // volitelně: označ jako sponsor (můžeš pak stylovat)
    el.dataset.type = "sponsor";
  } else {
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", item.name);
    el.dataset.type = "sponsor";
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

    if (items.length === 0 && introEl) {
      introEl.textContent = "Zatím tu nejsou žádní sponzoři.";
    }
  } catch (err) {
    console.error(err);
    if (introEl) introEl.textContent = "Sponzory se nepodařilo načíst.";
  }
}

loadLayout()
  .then(() => Promise.all([renderSellersFromJson(), renderSponsorsFromJson()]))
  .catch(console.error);


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

  dlg.querySelector(".lightbox__close")?.addEventListener("click", closeLightbox);
  dlg.querySelector(".lightbox__nav--prev")?.addEventListener("click", () => stepLightbox(-1));
  dlg.querySelector(".lightbox__nav--next")?.addEventListener("click", () => stepLightbox(1));

  // klik mimo obsah (na backdrop) zavře
  dlg.addEventListener("click", (e) => {
    const rect = dlg.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inside) closeLightbox();
  });

  // klávesnice
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
    galleryItems = items.filter(x => x && x.src);

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

loadLayout()
  .then(() => Promise.all([
    renderSellersFromJson(),
    renderSponsorsFromJson(),
    renderGalleryFromJson()
  ]))
  .catch(console.error);

  function initContactForm() {
  const form = document.querySelector("#contact-form");
  const status = document.querySelector("#contact-status");
  if (!form || !status) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    status.textContent = "Díky! Zpráva je připravená k odeslání (napojíme na odesílací službu).";
    form.reset();
  });
}
