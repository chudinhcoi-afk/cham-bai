# Bộ thử đọc phiếu KHUNG TRẢ LỜI (bài kiểm tra)

Vẽ phiếu giả giống phiếu MathBank in (ô 3,5 mm, chữ số in xám trong ô), mô phỏng ảnh chụp điện thoại
(nghiêng, mờ, nhiễu, ánh sáng không đều, JPEG), rồi chạy đúng các hàm `wak*` lấy từ `index.html` bằng Node.

Cần: Node, Python 3 với numpy, opencv-python, Pillow; font Liberation Sans (Linux) hoặc Arial (máy Mac).

```bash
cd tools/thu-doc-phieu
node extract.js ../../index.html omr.js                       # lấy lõi đọc phiếu từ index.html
node geom.js ./omr.js '{"id":3611,"v":5,"tn":[],"ds":[],"tln":["-48","1","2,5","13","-0,5","7","12","350","4","-2","0,25","9","88","6","-1","100"]}' > g16.json
python3 sweep.py omr.js g16.json blank 24        # phiếu bỏ trống
python3 sweep.py omr.js g16.json boldblank 16    # bỏ trống, chữ số in đậm (như phiếu photo)
python3 sweep.py omr.js g16.json mixed 20        # tô đủ kiểu đậm / bút chì / nhạt
```

Loại phiếu: `blank`, `boldblank`, `sparse` (chỉ tô 1–3 câu), `mixed`, `boldmixed`, `dark`, `faint`, `veryfaint`, `partial` (tô không kín), `tlnblank` (tô trắc nghiệm, bỏ trống trả lời ngắn), `comma` (đáp số thập phân, ô dấu phẩy / dấu trừ chỉ chấm nhẹ một chấm).

Kết quả: `blank_as_mark` = ô trống bị đọc là có tô; `mark_missed` = ô tô bị bỏ sót; `wrong` = đọc ra đáp án khác; `review` = câu máy báo chưa chắc (thầy cô chấm tay); `tln_review` / `tln_wrong` = số CÂU trả lời ngắn máy báo chưa chắc / ghép ra đáp số khác bài học sinh (vd 165 thay cho 16,5).

```bash
python3 sweep.py omr.js g16.json comma 30    # ô dấu phẩy / dấu trừ chỉ chấm nhẹ (V22.2)
```
