# PICORA

Prototype frontend cho **PICORA** — nền tảng SaaS cho nhiều studio ảnh cùng đăng ký, tạo, quản lý và chia sẻ album cho khách. Slogan: *Your Photos. Your Memories.*

Ứng dụng chạy hoàn toàn trên trình duyệt. Không có backend và không có database. Studio, tài khoản, album và phiên đăng nhập được lưu trong `localStorage` (key `picora.db.v3`).

## Mô hình SaaS

- **Mỗi studio là một tenant.** Album, ảnh, thương hiệu, thành viên và gói dịch vụ đều thuộc về một studio; màn quản trị chỉ đọc dữ liệu của studio đang đăng nhập.
- **Đăng ký studio** tại `/signup`: tên studio, địa chỉ studio (slug), tài khoản chủ studio. Studio mới bắt đầu ở gói Miễn phí.
- **Vai trò:** *Chủ studio* quản lý thương hiệu, thành viên, gói dịch vụ; *Nhân viên* quản lý album, ảnh và chia sẻ. Một tài khoản có thể thuộc nhiều studio và chuyển studio ở khối tên studio trên sidebar.
- **Gói dịch vụ** (`src/data/plans.js`): Miễn phí (5 GB, 10 album, 2 thành viên), Pro (199.000đ/tháng, 200 GB, 5 thành viên), Business (599.000đ/tháng, 1 TB, 20 thành viên). Store chặn tạo album, thêm thành viên và tải ảnh khi vượt giới hạn. Chưa tích hợp thanh toán: đổi gói có hiệu lực ngay.
- **Link khách** có dạng `/s/:studio/:album`. Slug album chỉ cần duy nhất trong studio. Gallery dùng logo, màu và khẩu hiệu của studio sở hữu album, chân trang ghi "Vận hành bởi PICORA". Link cũ `/gallery/:album` tự chuyển sang link mới.
- **Quản trị nền tảng** tại `/platform`: tạo studio mới (chọn gói, gán chủ studio bằng tài khoản mới hoặc email đã có), danh sách studio, dung lượng, đổi gói, tạm khóa / mở lại studio. Studio bị tạm khóa không đăng nhập được và album tạm ẩn với khách.

## Chạy dự án

Yêu cầu: Node.js 20+.

```bash
npm install
npm run dev
```

Mở [http://localhost:5173](http://localhost:5173).

Bản build tĩnh:

```bash
npm run build
npm run preview
```

Ảnh minh họa lấy từ Unsplash, nên máy cần có mạng để thấy photography. Giao diện và dữ liệu album vẫn chạy local.

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

### Thêm template mới

1. Tạo module trong `src/components/templates/` export `render(model, context)`, `mount(model)` và `thumbnail(demoModel)`.
2. Thêm metadata vào `src/components/templates/catalog.js` và đăng ký renderer trong `src/components/templates/index.js`.
3. Thêm album mẫu trong `src/data/template-demos.js`.

Không cần sửa logic quản lý album. Template nhận model chung từ `toGalleryModel()` (`src/components/gallery/model.js`), không đọc store trực tiếp.

## Luồng nên xem

1. Đăng nhập bằng `khoa@minhkhoa.studio`, xem Tổng quan, Album, Lưu trữ, Cài đặt (Studio, Thương hiệu, Thành viên, Gói dịch vụ, Tài khoản).
2. Tạo album, chọn template ở bước 2, xuất bản, sao chép link ở màn Chia sẻ.
3. Vào Quản lý ảnh, kéo thả vài ảnh JPG/PNG/WEBP, chọn ảnh bìa, đổi thứ tự, xóa ảnh.
4. Đăng xuất, đăng nhập `lan@lumiere.vn` để thấy studio khác hoàn toàn tách biệt, hoặc `thuha@minhkhoa.studio` để thấy quyền nhân viên.
5. Đăng ký studio mới ở `/signup`, hoặc vào `/platform` bằng `admin@picora.vn`.
6. Mở gallery khách (nên mở ở cửa sổ ẩn danh, vì thành viên studio đang đăng nhập sẽ thấy chế độ xem trước):

| Đường dẫn | Trạng thái |
| --- | --- |
| `/s/minh-khoa-studio/minh-anh-hoang-nam` | Wedding Luxury, 120 ảnh |
| `/s/minh-khoa-studio/linh-chi` | Editorial Magazine |
| `/s/minh-khoa-studio/hoang-long` | Masonry Gallery, 150 ảnh |
| `/s/minh-khoa-studio/thu-trang-duc-anh` | Dark Cinematic |
| `/s/minh-khoa-studio/ngoc-ha` | Có mật khẩu. Demo: `prewed98` |
| `/s/minh-khoa-studio/thanh-tung` | Album đã hết hạn |
| `/s/minh-khoa-studio/tuan-anh` | Bản nháp, khách chưa xem được |
| `/s/lumiere-wedding/an-khang-bao-ngoc` | Album của Lumière Wedding, thương hiệu riêng |
| `/s/lumiere-wedding/ngoc-ha` | Slug của studio khác → không tìm thấy |
| `/gallery/linh-chi` | Link cũ, tự chuyển sang `/s/minh-khoa-studio/linh-chi` |

Ẩn một album trong menu album rồi mở lại link để thấy trạng thái không khả dụng.

## Ghi chú dữ liệu

- Tạo, sửa, xóa album, template, mật khẩu, hạn dùng, thứ tự ảnh và cài đặt được giữ sau khi refresh.
- Dữ liệu cũ từ bản trước (một studio) được tự chuyển vào Minh Khoa Studio: album giữ nguyên ảnh, template và cài đặt.
- Ảnh upload từ máy dùng File API và object URL. Trình duyệt không lưu được file gốc trong `localStorage`, nên preview ảnh upload sẽ mất khi tải lại trang. Ảnh mẫu của album demo vẫn còn.
- Download album đóng gói ZIP bằng JSZip. Nếu một ảnh remote không tải được, file zip vẫn được tạo và ghi chú ảnh đó.
- Nút **Khôi phục dữ liệu demo** trong Cài đặt → Studio đưa toàn bộ nền tảng về bộ mẫu ban đầu (xóa cả studio tự đăng ký).
# PRICORA
