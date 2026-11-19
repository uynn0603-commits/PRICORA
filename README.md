# PICORA

Prototype frontend cho **PICORA** — nền tảng tạo, quản lý và chia sẻ album ảnh. Slogan: *Your Photos. Your Memories.*

Ứng dụng chạy hoàn toàn trên trình duyệt. Không có backend và không có database. Album, cài đặt và phiên đăng nhập được lưu trong `localStorage`.

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

- Email: `admin@view.vn`
- Password: `123456`

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

1. Đăng nhập, xem Overview, Albums, Storage, Settings.
2. Tạo album, chọn template ở bước 2, publish, copy link ở màn Share.
3. Vào Manage photos, kéo thả vài ảnh JPG/PNG/WEBP, chọn cover, đổi thứ tự, xóa ảnh.
4. Mở gallery khách:

| Đường dẫn | Trạng thái |
| --- | --- |
| `/gallery/minh-anh-hoang-nam` | Wedding Luxury, 120 ảnh |
| `/gallery/linh-chi` | Editorial Magazine |
| `/gallery/hoang-long` | Masonry Gallery, 150 ảnh |
| `/gallery/thu-trang-duc-anh` | Dark Cinematic |
| `/gallery/ngoc-ha` | Có mật khẩu. Demo: `prewed98` |
| `/gallery/thanh-tung` | Album đã hết hạn |
| `/gallery/tuan-anh` | Bản nháp, khách chưa xem được |
| `/gallery/khong-ton-tai` | Link không hợp lệ |

Ẩn một album trong menu album rồi mở lại link để thấy trạng thái unavailable.

## Ghi chú dữ liệu

- Tạo, sửa, xóa album, template, mật khẩu, hạn dùng, thứ tự ảnh và cài đặt được giữ sau khi refresh.
- Dữ liệu cũ từ bản trước được tự nâng cấp: album được gán template theo dịp chụp, không mất ảnh hay link.
- Ảnh upload từ máy dùng File API và object URL. Trình duyệt không lưu được file gốc trong `localStorage`, nên preview ảnh upload sẽ mất khi tải lại trang. Ảnh mẫu của album demo vẫn còn.
- Download album đóng gói ZIP bằng JSZip. Nếu một ảnh remote không tải được, file zip vẫn được tạo và ghi chú ảnh đó.
- Nút **Reset demo data** trong Settings → General đưa dữ liệu về bộ mẫu ban đầu.
# PRICORA
