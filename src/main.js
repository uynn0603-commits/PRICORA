import "./styles/main.css";
import { BROKEN_IMAGE } from "./data/media.js";
import { applyBrand, getSession, getSettings } from "./data/store.js";
import { closeLightbox } from "./components/lightbox.js";
import { closeMenu } from "./components/menu.js";
import { closeModal } from "./components/modal.js";
import { bindShell, renderShell } from "./components/shell.js";
import { closeTemplatePreview } from "./components/template-selector/TemplatePreview.js";
import { albumFormPage } from "./pages/album-form.js";
import { albumTemplatePage } from "./pages/album-template.js";
import { templateDemoPage } from "./pages/template-demo.js";
import { albumsPage } from "./pages/albums.js";
import { dashboardPage } from "./pages/dashboard.js";
import { galleryPage } from "./pages/gallery.js";
import { loginPage } from "./pages/login.js";
import { notFoundPage } from "./pages/not-found.js";
import { photosPage } from "./pages/photos.js";
import { settingsPage } from "./pages/settings.js";
import { sharePage } from "./pages/share.js";
import { storagePage } from "./pages/storage.js";
import { runCleanups } from "./utils/lifecycle.js";
import { matchRoute, setRenderer, startRouter } from "./utils/router.js";

applyBrand(getSettings());

const pages = {
  login: loginPage,
  dashboard: dashboardPage,
  albums: albumsPage,
  "album-form": albumFormPage,
  photos: photosPage,
  share: sharePage,
  storage: storagePage,
  settings: settingsPage,
  "album-template": albumTemplatePage,
  gallery: galleryPage,
  "template-demo": templateDemoPage,
  "not-found": notFoundPage,
};

const ADMIN = new Set(["dashboard", "albums", "album-form", "album-template", "photos", "share", "storage", "settings"]);

function render(options = {}) {
  runCleanups();
  closeLightbox();
  closeTemplatePreview();
  closeMenu();
  closeModal();
  const route = matchRoute(location.pathname);
  const session = getSession();
  if (route.name === "login" && session) {
    history.replaceState({}, "", "/admin");
    render(options);
    return;
  }
  if (ADMIN.has(route.name) && !session) {
    history.replaceState({}, "", "/login");
    render(options);
    return;
  }
  document.documentElement.classList.toggle("is-embedded", route.query.embed === "1");
  const page = pages[route.name] || notFoundPage;
  const html = page.render(route);
  const app = document.getElementById("app");
  if (ADMIN.has(route.name)) {
    app.innerHTML = renderShell({ path: location.pathname, content: html });
    bindShell();
  } else {
    app.innerHTML = html;
  }
  page.mount?.(route);
  document.title = page.title?.(route) || "PICORA";
  if (!options.keepScroll) window.scrollTo(0, 0);
}

document.addEventListener(
  "error",
  (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    if (image.dataset.fallback === "1") return;
    image.dataset.fallback = "1";
    image.src = BROKEN_IMAGE;
  },
  true,
);

setRenderer(render);
startRouter();
render();
