/**
 * Compresses an image file using the Canvas API and returns a Base64 string.
 * @param file The original image file.
 * @param maxWidth Max width of the resulting image.
 * @param quality Quality from 0 to 1.
 * @returns A promise that resolves to a compressed Data URL (Base64).
 */
export async function compressImageToBase64(
    file: File,
    maxWidth: number = 1000,
    quality: number = 0.6
): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions (keeping aspect ratio)
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Convert to Base64 (Data URL)
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error('Image load error'));
        };
        reader.onerror = () => reject(new Error('File reader error'));
    });
}
