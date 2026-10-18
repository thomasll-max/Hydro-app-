// Photo compression before upload: JPEG, longest side ≈ 1600 px, aiming at ≈ 300 KB.
export const PHOTO_MAX_SIDE = 1600
export const PHOTO_TARGET_BYTES = 300_000

export async function compressPhoto(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null)
  if (!bmp) return file
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  let q = 0.82
  let blob = await toJpeg(canvas, q)
  while (blob.size > PHOTO_TARGET_BYTES * 1.15 && q > 0.45) {
    q -= 0.08
    blob = await toJpeg(canvas, q)
  }
  return blob
}

function toJpeg(c: HTMLCanvasElement, q: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", q))
}
