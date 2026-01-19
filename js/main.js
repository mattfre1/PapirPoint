const btn = document.querySelector(".menu-btn");
const nav = document.querySelector("#main-nav");

btn.addEventListener("click", () => {
  const isOpen = btn.getAttribute("aria-expanded") === "true";
  btn.setAttribute("aria-expanded", String(!isOpen));
  nav.hidden = isOpen;
});
