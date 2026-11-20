export class ApiError extends Error {
  status: number;
  data: { error?: string; errors?: Record<string, string>; code?: string } | null;

  constructor(status: number, data: ApiError["data"]) {
    super(data?.error || `Request failed (${status})`);
    this.status = status;
    this.data = data;
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  const { method = options.body === undefined ? "GET" : "POST", body, headers = {} } = options;
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? headers : { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, { error: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại." });
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}

export function errorMessage(error: unknown, fallback = "Đã có lỗi xảy ra. Vui lòng thử lại."): string {
  return error instanceof ApiError ? error.data?.error || fallback : fallback;
}

// PUT a file to a presigned URL, reporting upload progress between 0 and 1.
export function uploadFile(url: string, file: Blob, onProgress?: (value: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    if (file.type) request.setRequestHeader("content-type", file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.min(0.97, event.loaded / event.total));
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new ApiError(request.status, { error: "Kho lưu trữ từ chối tệp này." }));
    request.onerror = () => reject(new ApiError(0, { error: "Mất kết nối khi đang tải ảnh lên." }));
    request.send(file);
  });
}

// Network drops, rate limits and server errors are worth retrying; validation errors are not.
export function isTransient(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status === 429 || error.status >= 500);
}

function waitOnline(): Promise<void> {
  if (typeof navigator === "undefined" || navigator.onLine) return Promise.resolve();
  return new Promise((resolve) => window.addEventListener("online", () => resolve(), { once: true }));
}

export async function withRetry<T>(task: () => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= attempts || !isTransient(error)) throw error;
      await waitOnline();
      await new Promise((resolve) => setTimeout(resolve, 800 * 2 ** (attempt - 1)));
    }
  }
}
