# PICORA

**PICORA** — nền tảng SaaS cho nhiều studio ảnh cùng đăng ký, tạo, quản lý và chia sẻ album cho khách. Slogan: *Your Photos. Your Memories.*

Một repo, một lần deploy:

- **Frontend:** Next.js (App Router) + React + TypeScript + Tailwind CSS. Các trang render phía client và đọc dữ liệu qua `/api`.
- **Backend:** Hono chạy trong route handler `src/app/api/[...route]/route.ts`, Postgres (Row-Level Security theo studio), ảnh lưu trên Cloudflare R2 (S3 API) hoặc ổ đĩa local khi phát triển.

## Mô hình SaaS

- **Mỗi studio là một tenant.** Album, ảnh, thương hiệu, thành viên và gói dịch vụ đều thuộc về một studio; màn quản trị chỉ đọc dữ liệu của studio đang đăng nhập.
- **Đăng ký studio** tại `/signup`: tên studio, địa chỉ studio (slug), tài khoản chủ studio. Studio mới bắt đầu ở gói Miễn phí.
- **Vai trò:** *Chủ studio* quản lý thương hiệu, thành viên, gói dịch vụ; *Nhân viên* quản lý album, ảnh và chia sẻ. Một tài khoản có thể thuộc nhiều studio và chuyển studio ở khối tên studio trên sidebar.
- **Gói dịch vụ & chuyển khoản VietQR** (`src/lib/plans.ts`, `src/lib/billing.ts`): Miễn phí (5 GB, 10 album, 2 thành viên), Pro (199.000đ/tháng, 200 GB, 5 thành viên), Business (599.000đ/tháng, 1 TB, 20 thành viên). Server chặn tạo album, thêm thành viên và tải ảnh khi vượt giới hạn. Đổi sang hoặc gia hạn gói trả phí hiện mã VietQR điền sẵn số tiền + mã giao dịch; studio tải ảnh xác nhận chuyển khoản (trạng thái *Đợi quản trị viên xác nhận*). Gói trả phí tính theo tháng dương lịch (hết hạn đầu tháng tiếp theo): khi hết hạn, studio bị chặn tạo/tải/sửa album (vẫn vào được trang Gói dịch vụ để nộp tiền), còn album đã giao cho khách vẫn xem bình thường.
- **Link khách** có dạng `/s/:studio/:album`. Slug album chỉ cần duy nhất trong studio. Gallery dùng logo, màu và khẩu hiệu của studio sở hữu album, chân trang ghi "Vận hành bởi PICORA". Link cũ `/gallery/:album` tự chuyển sang link mới.
- **Quản trị nền tảng** tại `/platform`: tạo studio mới, theo dõi danh sách studio và hạn gói, cấu hình tài khoản ngân hàng nhận tiền (VietQR), duyệt hoặc từ chối ảnh xác nhận chuyển khoản của studio, tạm khóa / mở lại studio. Studio bị tạm khóa không đăng nhập được và album tạm ẩn với khách.

## Chạy dự án

Yêu cầu: Node.js 20+, Docker (cho Postgres local).

```bash
npm install
cp .env.example .env.local
npm run db:up       # Postgres 17 trong Docker, cổng 5434
npm run db:setup    # tạo bảng, role, RLS rồi nạp dữ liệu demo
npm run dev
```

Mở [http://localhost:5173](http://localhost:5173). Ảnh upload khi phát triển được lưu trong `.data/media` (đã gitignore). `npm run db:seed` đưa database về dữ liệu demo bất cứ lúc nào.

Khi kéo code mới về, chạy `npm run db:migrate`: script chỉ áp dụng các file trong `db/migrations/` chưa chạy (ghi trong bảng `schema_migrations`), không đụng tới dữ liệu đang có.

Kiểm tra kiểu và chạy bản production:

```bash
npm run typecheck
npm run build
npm start
```

### Biến môi trường

| Biến | Ý nghĩa |
| --- | --- |
| `DATABASE_URL` | Kết nối của ứng dụng. Role này **không** sở hữu bảng nên luôn bị RLS áp dụng. `db:migrate` tự tạo role theo user/mật khẩu trong URL. |
| `MIGRATION_DATABASE_URL` | Kết nối có quyền owner, chỉ dùng cho `db:migrate` và `db:seed`. |
| `SESSION_SECRET` | Ký link upload và token mở album có mật khẩu. Production phải là chuỗi ngẫu nhiên dài. |
| `APP_TIMEZONE` | Múi giờ tính ngày hết hạn album, mặc định `Asia/Ho_Chi_Minh`. |
| `STORAGE_DRIVER` | `local` (ổ đĩa) hoặc `s3` (R2 / S3). |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Thông tin bucket khi `STORAGE_DRIVER=s3`. Với R2: endpoint `https://<account>.r2.cloudflarestorage.com`, region `auto`. |
| `MEDIA_PUBLIC_URL` | Domain public của bucket (custom domain hoặc `r2.dev`), không có `/` ở cuối. **Để trống** nếu bucket là private (xem mục B2 bên dưới). |
| `ALLOW_DEMO_RESET` | `true` để bật nút **Khôi phục dữ liệu demo**. Production nên để `false`. |

### Deploy lên Vercel + Neon + R2

1. **Neon:** tạo database, lấy connection string owner làm `MIGRATION_DATABASE_URL`. Đặt `DATABASE_URL` cùng host nhưng user/mật khẩu mới (ví dụ `picora_api` + mật khẩu mạnh), rồi chạy `npm run db:migrate` từ máy với hai biến này để tạo bảng và role. Chỉ chạy `db:seed` nếu muốn có dữ liệu demo. Mỗi lần deploy bản có migration mới, chạy lại `db:migrate` trước.
2. **R2:** tạo bucket, bật public access (custom domain hoặc `r2.dev`), tạo API token quyền Object Read & Write cho bucket. Thêm CORS cho bucket: `PUT` để trình duyệt upload thẳng, `GET` để nút tải ảnh và tải ZIP đọc được file gốc:
   ```json
   [{ "AllowedOrigins": ["https://<domain-của-bạn>"], "AllowedMethods": ["GET", "PUT"], "AllowedHeaders": ["content-type"], "MaxAgeSeconds": 3600 }]
   ```
3. **Vercel:** import repo, preset **Next.js**. Khai báo `DATABASE_URL`, `SESSION_SECRET`, `STORAGE_DRIVER=s3`, các biến `S3_*`, `MEDIA_PUBLIC_URL`, `ALLOW_DEMO_RESET=false`. Không cần khai báo `MIGRATION_DATABASE_URL` trên Vercel.

Ảnh đi thẳng từ trình duyệt lên R2 bằng presigned URL, nên giới hạn kích thước request của Vercel không ảnh hưởng tới upload.

CORS cũng có thể cài bằng script (chạy được cho cả R2 và B2), truyền các domain của app:

```bash
S3_ENDPOINT=... S3_REGION=... S3_BUCKET=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
npm run storage:cors -- https://<domain-của-bạn>
```

### Lưu ảnh tạm trên Backblaze B2 (giai đoạn dùng thử)

B2 cho tạo bucket **Private** miễn phí không cần thẻ (bucket Public đòi thẻ). Khi `STORAGE_DRIVER=s3` và `MEDIA_PUBLIC_URL` để trống, app coi bucket là private: mọi ảnh có địa chỉ `/api/media/file/<key>`, server trả về redirect tới link B2 đã ký. Link giữ nguyên trong mỗi khung 6 giờ nên trình duyệt và CDN của Vercel cache được. Upload vẫn đi thẳng từ trình duyệt lên B2.

1. Tạo bucket **Private**, Lifecycle **Keep only the last version of the file**. Tạo Application Key chỉ cho bucket đó, quyền Read and Write.
2. Biến môi trường trên Vercel (ví dụ vùng `us-west-004`, lấy đúng mã vùng trong Endpoint của bucket):
   ```
   STORAGE_DRIVER=s3
   S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com
   S3_REGION=us-west-004
   S3_BUCKET=<tên bucket>
   S3_ACCESS_KEY_ID=<keyID>
   S3_SECRET_ACCESS_KEY=<applicationKey>
   MEDIA_PUBLIC_URL=
   ```
   `S3_REGION` phải đúng mã vùng, không dùng `auto` như R2.
3. Cài CORS bằng `npm run storage:cors -- https://<domain-của-bạn>` (giao diện web của B2 không cho cấu hình `PUT`).

Giới hạn miễn phí khi chưa có thẻ: 10GB lưu trữ, khoảng 1GB tải xuống và 2.500 lượt đọc file mỗi ngày (reset 0h UTC). Vượt giới hạn thì ảnh tạm không tải được tới hôm sau, dữ liệu không mất. Nên tắt **Cho phép tải ảnh** ở album trong giai đoạn này.

### Chuyển từ B2 sang R2

Database chỉ lưu key tương đối (`studios/...`, `users/...`), không lưu domain, nên chuyển kho ảnh không cần sửa dữ liệu hay code:

1. Tạo bucket R2 public và API token như mục **Deploy** ở trên, cài CORS bằng `npm run storage:cors`.
2. Copy toàn bộ file sang, giữ nguyên key, ví dụ bằng [rclone](https://rclone.org): cấu hình hai remote `b2` và `r2` (kiểu `s3`), rồi chạy `rclone copy b2:<bucket-b2> r2:<bucket-r2> --progress`.
3. Trên Vercel đổi `S3_ENDPOINT`, `S3_REGION=auto`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` sang R2 và **điền** `MEDIA_PUBLIC_URL` (domain public của R2), rồi Redeploy. Ảnh lúc này tải thẳng từ R2, không qua `/api/media/file` nữa.
4. Chạy lại `rclone copy` một lần sau khi redeploy để lấy nốt ảnh upload trong lúc chuyển, kiểm tra vài album rồi mới xoá bucket B2.

### Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `src/app/` | Route: `/login`, `/signup`, `/platform`, `/admin/*`, `/s/[studio]/[album]`, `/gallery/[slug]`, `/templates/[id]/demo`, `/api/*` |
| `src/components/` | Shell quản trị, album, cài đặt, gallery, template, overlay (toast, modal, menu) |
| `src/lib/store.ts` | Bản sao dữ liệu phía trình duyệt (nạp từ `/api/bootstrap`) và các thao tác gọi API |
| `src/lib/` | Kiểu dữ liệu, gói dịch vụ, catalog template, dữ liệu mẫu, định dạng |
| `src/server/` | Backend: app Hono, xác thực, phân quyền, truy vấn Postgres, storage, seed |
| `src/server/routes/` | `auth`, `studio`, `albums`, `public` (gallery khách, gửi lựa chọn), `platform`, `media` (driver local) |
| `src/server/gallery.ts` | Xác định trạng thái gallery (mở, mật khẩu, hết hạn, ẩn…), dùng chung cho API và metadata |
| `db/migrations/` | SQL schema và chính sách RLS |
| `scripts/` | `migrate.ts`, `seed.ts` |

Ảnh minh họa của album demo lấy từ Unsplash, nên máy cần có mạng để thấy photography.

### Bảo mật

- **Cách ly studio:** mọi truy vấn của studio chạy trong transaction đặt `app.studio_id`; chính sách RLS trên `albums`, `photos`, `memberships` chỉ trả về dòng của studio đó, kể cả khi code quên điều kiện `where`.
- **Phiên đăng nhập:** cookie `HttpOnly`, `SameSite=Lax`; database chỉ lưu SHA-256 của token. Mật khẩu băm PBKDF2-SHA256 (100.000 vòng). Đổi mật khẩu sẽ đăng xuất các phiên khác.
- **Album có mật khẩu:** server kiểm tra mật khẩu và cấp token ký HMAC; trình duyệt của khách không bao giờ nhận mật khẩu hay ảnh trước khi mở khóa. Giới hạn 10 lần thử / 10 phút cho mỗi IP và album.
- **Upload:** link upload chỉ ghi được vào thư mục của đúng studio và album, hết hạn sau 15 phút. Server kiểm tra kích thước thật, hạn mức gói và chữ ký tệp (JPG/PNG/WEBP) trước khi gắn ảnh vào album. Bản thu nhỏ cũng được kiểm tra đúng key, đúng định dạng ảnh và giới hạn dung lượng; bản không hợp lệ bị xóa, gallery dùng ảnh gốc thay thế.
- **Ảnh đại diện:** trình duyệt cắt vuông và thu về 512px trước khi tải lên `users/<id người dùng>/`. Server chỉ nhận key trong thư mục của chính tài khoản, tối đa 2 MB, đúng chữ ký ảnh; ảnh cũ bị xóa khi đổi hoặc gỡ.
- **Chọn ảnh:** khách chỉ gửi được ID ảnh thuộc chính album đó, trong giới hạn số ảnh studio đặt. Album phải đang mở với khách (đã mở khóa nếu có mật khẩu); chế độ xem trước của studio không gửi được, và danh sách đã chốt thì khách không sửa được.

## Tài khoản demo

Mật khẩu chung: `123456`. Bấm vào tài khoản ở màn đăng nhập để điền nhanh.

| Email | Vai trò |
| --- | --- |
| `khoa@minhkhoa.studio` | Chủ studio · Minh Khoa Studio (gói Miễn phí) |
| `thuha@minhkhoa.studio` | Nhân viên · Minh Khoa Studio |
| `lan@lumiere.vn` | Chủ studio · Lumière Wedding (gói Pro) |
| `admin@picora.vn` | Quản trị nền tảng PICORA |

## Album templates

Mỗi album có một `templateId`. Cùng một dữ liệu album, khách sẽ thấy gallery theo template đã chọn.

| Template | Phong cách | Demo |
| --- | --- | --- |
| Wedding Luxury | Nền ngà, Playfair Display, ảnh lớn xen kẽ full-width / hai cột | `/templates/wedding-luxury/demo` |
| Editorial Magazine | Bố cục tạp chí bất đối xứng, đánh số N°, mục lục ảnh | `/templates/editorial-magazine/demo` |
| Masonry Gallery | Lưới masonry 2–4 cột, tải dần theo lô, nhanh với album lớn | `/templates/masonry-gallery/demo` |
| Dark Cinematic | Hero toàn màn hình, nền tối, khung 2.39:1 như phim | `/templates/dark-cinematic/demo` |

Template nào cũng có cover, tên album, khách hàng, ngày chụp, tổng số ảnh, gallery, lightbox (trước/sau, phím mũi tên, vuốt), tải từng ảnh và tải cả album dạng ZIP.

- **Tạo album** gồm 2 bước: thông tin album → chọn template. Template được gợi ý theo dịp chụp cho tới khi bạn chọn tay.
- **Preview** mở trang mẫu trong khung Desktop hoặc Mobile, có thể chọn template ngay trong preview.
- **Change template** (menu album, thẻ album, màn Share) đổi giao diện mà không đổi ảnh, thông tin hay link chia sẻ. Preview ở màn này dùng chính ảnh của album.
- Tắt **Allow downloads** trong form album để ẩn các nút tải.

### Khách chọn ảnh

Bật **Cho khách chọn ảnh** trong form album (có thể đặt số ảnh yêu thích tối đa, để trống là không giới hạn). Gallery của mọi template sẽ có hai nút trên từng ảnh và trong lightbox, cùng một thanh lựa chọn ở cuối trang. Khách có hai danh sách độc lập:

- **Yêu thích** (trái tim): chạm một lần để thả/bỏ tim, không mở bảng nào. Giới hạn số ảnh chỉ áp dụng cho danh sách này.
- **Cần sửa** (nút ghi chú): một bảng trượt lên (trên điện thoại) để ghi **yêu cầu chỉnh sửa** cho riêng ảnh đó, gõ tay hoặc chạm gợi ý nhanh (Chỉnh da, Làm sáng, Xóa vật thừa…). Ảnh nào cũng ghi được, không cần thả tim. Trong lightbox, yêu cầu của ảnh hiện ở cuối màn hình để khách xem lại và sửa.
- Khách xem lại các ảnh đã đánh dấu, thêm ghi chú chung rồi bấm **Gửi cho studio** (cần ít nhất một ảnh yêu thích hoặc một yêu cầu sửa). Bản nháp được giữ trên trình duyệt nên tải lại trang không mất. Gửi lại sẽ thay danh sách cũ.
- Studio nhận thông báo kèm số ảnh yêu thích và số ảnh cần sửa, và thấy khối lựa chọn của khách ở trang Quản lý ảnh: yêu cầu hiện ngay dưới từng thẻ ảnh; lọc **Tất cả / Yêu thích / Cần sửa**, sao chép tên tệp của danh sách đang xem, tải danh sách `.txt` (hai phần: ảnh yêu thích, rồi ảnh cần sửa kèm yêu cầu), **Chốt danh sách** (khách không sửa được nữa) hoặc **Mở lại**, và xóa lựa chọn.
- **Báo đã sửa:** trên thẻ ảnh có yêu cầu, studio bấm **Đánh dấu đã sửa**: có thể tải ảnh đã sửa thay ảnh gốc (giữ nguyên vị trí, tên, tim và yêu cầu; file cũ bị xóa) và để lại lời nhắn cho khách. Khách thấy nhãn **Đã sửa** trên ảnh, lời nhắn trong bảng ghi chú/lightbox và dòng "Studio đã sửa xong x/y ảnh" ở thanh dưới. Không có email/SMS: nút **Sao chép tin nhắn báo khách** tạo sẵn nội dung kèm link album để dán vào Zalo. Câu trả lời gắn với đúng nội dung yêu cầu: khách sửa lại yêu cầu và gửi lại thì ảnh tự quay về "Cần sửa". Studio có thể **Hoàn tác**.
- Mỗi album giữ một danh sách lựa chọn. Logic nằm ở `src/components/gallery/selection.ts` và `SelectionBar.tsx`, template không cần sửa gì.

### Thêm template mới

1. Tạo component trong `src/components/templates/` export một component gallery (nhận `TemplateProps`) và một component thumbnail.
2. Thêm metadata vào `src/lib/catalog.ts` và đăng ký trong `RENDERERS` ở `src/components/templates/index.ts`.
3. Thêm album mẫu trong `src/lib/template-demos.ts`.

Không cần sửa logic quản lý album. Template nhận model chung từ `toGalleryModel()` (`src/components/gallery/model.ts`), không đọc store trực tiếp.

## Luồng nên xem

1. Đăng nhập bằng `khoa@minhkhoa.studio`, xem Tổng quan, Album, Lưu trữ, Cài đặt (Studio, Thương hiệu, Thành viên, Gói dịch vụ, Tài khoản).
2. Tạo album, chọn template ở bước 2, xuất bản, sao chép link ở màn Chia sẻ.
3. Vào Quản lý ảnh, kéo thả vài ảnh JPG/PNG/WEBP, chọn ảnh bìa, đổi thứ tự, xóa ảnh. Ảnh lỗi mạng sẽ tự thử lại; ảnh vẫn lỗi có nút **Thử lại** mà không cần chọn lại tệp.
4. Mở `/s/minh-khoa-studio/minh-anh-hoang-nam` ở cửa sổ ẩn danh, bấm tim vài ảnh, gửi cho studio. Quay lại Quản lý ảnh của album *Minh Anh & Hoàng Nam* để xem danh sách khách chọn.
5. Đăng xuất, đăng nhập `lan@lumiere.vn` để thấy studio khác hoàn toàn tách biệt, hoặc `thuha@minhkhoa.studio` để thấy quyền nhân viên.
6. Đăng ký studio mới ở `/signup`, hoặc vào `/platform` bằng `admin@picora.vn`.
7. Mở gallery khách (nên mở ở cửa sổ ẩn danh, vì thành viên studio đang đăng nhập sẽ thấy chế độ xem trước):

| Đường dẫn | Trạng thái |
| --- | --- |
| `/s/minh-khoa-studio/minh-anh-hoang-nam` | Wedding Luxury, 120 ảnh |
| `/s/minh-khoa-studio/linh-chi` | Editorial Magazine |
| `/s/minh-khoa-studio/hoang-long` | Masonry Gallery, 150 ảnh |
| `/s/minh-khoa-studio/thu-trang-duc-anh` | Dark Cinematic |
| `/s/minh-khoa-studio/ngoc-ha` | Có mật khẩu: `prewed98` |
| `/s/minh-khoa-studio/thanh-tung` | Album đã hết hạn |
| `/s/minh-khoa-studio/tuan-anh` | Bản nháp, khách chưa xem được |
| `/s/lumiere-wedding/an-khang-bao-ngoc` | Album của Lumière Wedding, thương hiệu riêng |
| `/s/lumiere-wedding/ngoc-ha` | Slug của studio khác → không tìm thấy |
| `/gallery/linh-chi` | Link cũ, tự chuyển sang `/s/minh-khoa-studio/linh-chi` |

Ẩn một album trong menu album rồi mở lại link để thấy trạng thái không khả dụng.

## Ghi chú dữ liệu

- Mọi dữ liệu nằm trong Postgres; ảnh upload nằm trong storage, dùng chung giữa các trình duyệt và thiết bị.
- Thao tác nhỏ (đổi template, sắp xếp, xóa ảnh, ẩn album, gia hạn, màu thương hiệu) hiển thị ngay và lưu nền theo thứ tự. Nếu server từ chối, giao diện báo lỗi và tải lại dữ liệu từ server.
- **Ảnh nhỏ:** khi upload, trình duyệt tạo thêm bản preview (cạnh dài 2048px) và thumbnail (1024px) dạng JPEG rồi tải lên cùng ảnh gốc. Gallery và lightbox dùng `srcset` của hai bản này; ảnh gốc chỉ dùng khi khách bấm tải. Canvas chỉ được dùng ẩn để thu nhỏ ảnh, giao diện không vẽ bằng canvas. Ảnh upload trước khi có tính năng này, hoặc ảnh trình duyệt không đọc được, vẫn hiển thị bằng ảnh gốc.
- **Upload:** tải song song 3 ảnh một lúc. Lỗi mạng, 429 và lỗi 5xx được tự thử lại tối đa 4 lần (chờ tăng dần, chờ có mạng lại); bước xác nhận ảnh an toàn khi gửi lặp lại. Trang cảnh báo trước khi đóng tab nếu còn ảnh đang tải.
- **Xem trước link trên Zalo/Facebook:** trang `/s/:studio/:album` render metadata phía server (tiêu đề, mô tả, ảnh bìa 1200×630). Album có mật khẩu chỉ hiện tiêu đề, không lộ ảnh; album không khả dụng hiện tiêu đề chung. Gallery luôn gắn `noindex`.
- Download album đóng gói ZIP bằng JSZip. Nếu một ảnh remote không tải được, file zip vẫn được tạo và ghi chú ảnh đó.
- Nút **Khôi phục dữ liệu demo** trong Cài đặt → Studio đưa toàn bộ nền tảng về bộ mẫu ban đầu (xóa cả studio tự đăng ký và ảnh đã upload). Chỉ có khi `ALLOW_DEMO_RESET=true`.
- Giới hạn số lần thử mật khẩu album được đếm trong bộ nhớ của từng instance server; trên Vercel nhiều instance sẽ đếm riêng. Cần chặt hơn thì chuyển sang Redis/Upstash.
- URL ảnh trên R2 là public nhưng chứa ID ngẫu nhiên, không đoán được. Mật khẩu album được lưu dạng văn bản để nhân viên studio xem lại và gửi cho khách.
