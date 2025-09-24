(function () {
  const root = document.documentElement;
  const key = "ots-theme";
  function apply(t) { root.setAttribute("data-theme", t); }
  function getPreferred() {
    const saved = localStorage.getItem(key);
    if (saved) return saved;
    return "dark";
  }
  window.OTSTheme = {
    set: function (t) { localStorage.setItem(key, t); apply(t); },
    toggle: function () {
      const next = (root.getAttribute("data-theme") === "dark") ? "light" : "dark";
      localStorage.setItem(key, next); apply(next);
    }
  };
  apply(getPreferred());
})();
