// Shared across all public pages: theme toggle and mobile menu.
(function () {
  var root = document.documentElement;

  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function setTheme(t) {
    root.dataset.theme = t;
    var b = document.getElementById("themeBtn");
    if (b) {
      b.textContent = t === "dark" ? "\u2600" : "\u263E";
      b.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }
  }

  // Dark is the default; a saved choice wins.
  setTheme(read("theme") || "dark");

  var themeBtn = document.getElementById("themeBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.dataset.theme === "dark" ? "light" : "dark";
      setTheme(next);
      store("theme", next);
    });
  }

  var menuBtn = document.getElementById("menuBtn");
  var links = document.getElementById("links");
  if (menuBtn && links) {
    menuBtn.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open);
    });
  }

  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
// Show/hide password button on every password field
document.querySelectorAll('input[type="password"]').forEach(function (input) {
  var wrap = document.createElement("div");
  wrap.className = "pw";
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "pw-eye";
  btn.setAttribute("aria-label", "Show password");
  btn.textContent = "\uD83D\uDC41";
  btn.addEventListener("click", function () {
    var show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.style.opacity = show ? "1" : ".6";
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });
  wrap.appendChild(btn);
});