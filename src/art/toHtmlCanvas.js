/** Browser-only: converts a PixelCanvas into an HTMLCanvasElement. */
export function toHtmlCanvas(pixelCanvas) {
  const el = document.createElement('canvas');
  el.width = pixelCanvas.width;
  el.height = pixelCanvas.height;
  const ctx = el.getContext('2d');
  const img = new ImageData(new Uint8ClampedArray(pixelCanvas.data), pixelCanvas.width, pixelCanvas.height);
  ctx.putImageData(img, 0, 0);
  return el;
}
