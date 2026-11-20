let renderer = () => {};

export function setRenderer(fn) {
  renderer = fn;
}

export function rerender(options) {
  renderer(options);
}

export function navigate(path, options = {}) {
  const current = `${location.pathname}${location.search}`;
  if (path !== current) {
    if (options.replace) history.replaceState({}, "", path);
    else history.pushState({}, "", path);
  }
  renderer(options);
}

export function startRouter() {
  window.addEventListener("popstate", () => renderer());
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-link]");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || link.target === "_blank") return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(href);
  });
}

export function matchRoute(pathname) {
  const query = Object.fromEntries(new URLSearchParams(location.search));
  const routes = [
    { name: "login", re: /^\/$/ },
    { name: "login", re: /^\/login\/?$/ },
    { name: "signup", re: /^\/signup\/?$/ },
    { name: "platform", re: /^\/platform\/?$/ },
    { name: "dashboard", re: /^\/admin\/?$/ },
    { name: "album-form", re: /^\/admin\/albums\/new\/?$/ },
    { name: "album-form", re: /^\/admin\/albums\/([^/]+)\/edit\/?$/ },
    { name: "photos", re: /^\/admin\/albums\/([^/]+)\/photos\/?$/ },
    { name: "share", re: /^\/admin\/albums\/([^/]+)\/share\/?$/ },
    { name: "album-template", re: /^\/admin\/albums\/([^/]+)\/template\/?$/ },
    { name: "template-demo", re: /^\/templates\/([^/]+)\/demo\/?$/ },
    { name: "albums", re: /^\/admin\/albums\/?$/ },
    { name: "storage", re: /^\/admin\/storage\/?$/ },
    { name: "settings", re: /^\/admin\/settings\/?$/ },
    { name: "gallery", re: /^\/s\/([^/]+)\/([^/]+)\/?$/ },
    { name: "legacy-gallery", re: /^\/gallery\/([^/]+)\/?$/ },
  ];

  for (const route of routes) {
    const match = pathname.match(route.re);
    if (match) return { name: route.name, params: match.slice(1), query };
  }
  return { name: "not-found", params: [], query };
}
