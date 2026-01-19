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

async function loadLayout() {
  const p = pathPrefix();

  await inject("#site-header", `${p}partials/header.html`);
  await inject("#site-footer", `${p}partials/footer.html`);

  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();

  // menu logic až po vložení headeru
  const btn = document.querySelector(".menu-btn");
  const nav = document.querySelector("#main-nav");
  if (btn && nav) {
    btn.addEventListener("click", () => {
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!isOpen));
      nav.hidden = isOpen;
    });
  }

  // aktivní odkaz v menu
  const page = document.body.dataset.page;
  if (page) {
    const active = document.querySelector(`a[data-nav="${page}"]`);
    if (active) active.classList.add("is-active");
  }
}

loadLayout().catch(console.error);
