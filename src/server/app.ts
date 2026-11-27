import { Hono } from "hono";
import { loadAuth, type AppEnv } from "./auth";
import { albumRoutes } from "./routes/albums";
import { invitationRoutes } from "./routes/invitations";
import { authRoutes } from "./routes/auth";
import { mediaRoutes } from "./routes/media";
import { platformRoutes } from "./routes/platform";
import { publicRoutes } from "./routes/public";
import { studioRoutes } from "./routes/studio";

export const app = new Hono<AppEnv>().basePath("/api");

app.use(async (c, next) => {
  await next();
  c.header("cache-control", c.res.headers.get("cache-control") || "no-store");
});

app.route("/", mediaRoutes);
app.use(loadAuth);
app.route("/", authRoutes);
app.route("/", studioRoutes);
app.route("/", albumRoutes);
app.route("/", invitationRoutes);
app.route("/", publicRoutes);
app.route("/", platformRoutes);

app.notFound((c) => c.json({ error: "Không tìm thấy API." }, 404));

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Máy chủ gặp lỗi. Vui lòng thử lại." }, 500);
});
