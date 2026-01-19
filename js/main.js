async function inject(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;
  const res = await fetch(url);
  el.innerHTML = await res.text();
}

async function loadLayout() {
  await inject("#site-header", "/partials/header.html");
  await inject("#site-footer", "/partials/footer.html");

  // rok ve footeru
  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();

  // hamburger menu po vložení headeru
  const btn = document.querySelector(".menu-btn");
  const nav = document.querySelector("#main-nav");
  if (btn && nav) {
    btn.addEventListener("click", () => {
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!isOpen));
      nav.hidden = isOpen;
    });
  }

  // aktivní položka menu
  const page = document.body.dataset.page; // "home" | "about" | ...
  if (page) {
    const active = document.querySelector(`a[data-nav="${page}"]`);
    if (active) active.classList.add("is-active");
  }
}

loadLayout();
