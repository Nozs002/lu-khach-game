# Dữ liệu client

- `maps.ts`: kiểu MapData của WELCOME, tiles là ma trận collision từ server, chỉ 0 đi được.
- `tiledWorld.ts`, `world.generated.json`: các lớp hình ảnh Tiled, tileset và vùng camera.
- `characters.ts`: sprite và avatar nhân vật.
- items/skills chưa có dữ liệu gameplay.

`world.tmj` là nguồn map hiện tại; chạy npm run import-map để xuất lại. File generated không sửa tay. Dữ liệu và bộ dựng map cũ đã được dọn; chỉ dùng nguồn Tiled.
