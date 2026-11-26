/**
 * 釣果写真をブラウザ側 <canvas> で最大 maxEdgePx にリサイズし JPEG 圧縮した DataURL を返す
 * 外部ストレージ不要で IndexedDB / JSONバックアップに軽量保存できる
 */
export async function compressCatchPhoto(
  file: File,
  maxEdgePx = 800,
  quality = 0.74
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('画像フォーマットを解析できませんでした。'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxEdgePx || height > maxEdgePx) {
          if (width >= height) {
            height = Math.round((height * maxEdgePx) / width);
            width = maxEdgePx;
          } else {
            width = Math.round((width * maxEdgePx) / height);
            height = maxEdgePx;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvasコンテキストを取得できませんでした。'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
