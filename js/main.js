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
