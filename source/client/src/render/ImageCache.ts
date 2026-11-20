export class ImageCache {
    private cache = new Map<string, HTMLImageElement>();

    // Dùng đường dẫn làm khóa để chia sẻ ảnh giữa các renderer.
    get(src: string): HTMLImageElement {
        const cached = this.cache.get(src);
        if (cached) return cached;

        const img = new Image();
        img.onload = () => console.log(`[IMAGE OK] Đã tải ảnh: ${src}`);
        img.onerror = () => console.error(`[IMAGE LỖI] Không tải được ảnh: ${src}`);

        this.cache.set(src, img);
        img.src = src;
        return img;
    }
}

export const imageCache = new ImageCache();
