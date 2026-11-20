function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get timezone() {
    return process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh";
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  get storageDriver(): "local" | "s3" {
    return process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
  },
  get s3() {
    return {
      endpoint: required("S3_ENDPOINT").replace(/\/+$/, ""),
      region: process.env.S3_REGION || "auto",
      bucket: required("S3_BUCKET"),
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    };
  },
  get mediaPublicUrl() {
    return required("MEDIA_PUBLIC_URL").replace(/\/+$/, "");
  },
  get allowDemoReset() {
    return process.env.ALLOW_DEMO_RESET === "true";
  },
  get secureCookies() {
    return process.env.NODE_ENV === "production";
  },
};
