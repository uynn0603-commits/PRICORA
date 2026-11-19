import "./styles/main.css";
import { BROKEN_IMAGE } from "./data/media.js";
import { applyBrand, clearSession, currentStudio, findLegacyAlbum, galleryPath, getSession, getSettings } from "./data/store.js";
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
import { platformPage } from "./pages/platform.js";
import { settingsPage } from "./pages/settings.js";
import { signupPage } from "./pages/signup.js";
import { sharePage } from "./pages/share.js";
import { storagePage } from "./pages/storage.js";
import { runCleanups } from "./utils/lifecycle.js";
import { matchRoute, setRenderer, startRouter } from "./utils/router.js";

const pages = {
  login: loginPage,
  signup: signupPage,
  platform: platformPage,
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
const AUTH = new Set(["login", "signup"]);

function redirect(path, options) {
  history.replaceState({}, "", path);
  render(options);
}

function render(options = {}) {
  runCleanups();
  closeLightbox();
  closeTemplatePreview();
  closeMenu();
  closeModal();
  const route = matchRoute(location.pathname);
  const session = getSession();
  const home = session?.studioId ? "/admin" : "/platform";
  if (route.name === "legacy-gallery") {
    const found = findLegacyAlbum(route.params[0]);
    redirect(found ? `${galleryPath(found.album)}${location.search}` : `/s/-/${route.params[0]}`, options);
    return;
  }
  if (AUTH.has(route.name) && session) return redirect(home, options);
  if (ADMIN.has(route.name)) {
    if (!session) return redirect("/login", options);
    if (!session.studioId) return redirect("/platform", options);
    if (currentStudio()?.status !== "active") {
      clearSession();
      return redirect("/login?suspended=1", options);
    }
  }
  if (route.name === "platform") {
    if (!session) return redirect("/login", options);
    if (!session.user.platformAdmin) return redirect("/admin", options);
  }
  if (route.name !== "gallery") applyBrand(getSettings());
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
