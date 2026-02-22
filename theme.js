/* ─── Theme toggle ───────────────────────────────────────────────────────── */

const btn = document.getElementById("themeToggle");

function setIcon() {
  const isLight = document.body.classList.contains("light");
  btn.textContent = isLight ? "🌙" : "☀️";
}

btn.addEventListener("click", () => {
  document.body.classList.toggle("light");
  setIcon();
});

setIcon();