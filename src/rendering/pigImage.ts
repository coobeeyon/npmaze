/**
 * Loads the skinny pig photo for use as the start marker.
 * Falls back gracefully if the image is unavailable.
 */

let pigImage: HTMLImageElement | null = null;
let loadAttempted = false;
const onLoadCallbacks: Array<() => void> = [];

function loadPigImage(): void {
  if (loadAttempted) return;
  loadAttempted = true;

  const img = new Image();
  img.onload = () => {
    pigImage = img;
    // Notify listeners so the canvas can redraw with the photo
    for (const cb of onLoadCallbacks) cb();
  };
  img.onerror = () => {
    pigImage = null;
  };
  // The image should be placed at src/assets/skinny-pig.jpg (or .png/.webp)
  try {
    const modules = import.meta.glob('../assets/skinny-pig.{jpg,jpeg,png,webp}', {
      eager: true,
      query: '?url',
      import: 'default',
    });
    const key = Object.keys(modules)[0];
    if (key) {
      img.src = modules[key] as string;
    }
  } catch {
    pigImage = null;
  }
}

/** Get the loaded pig image, or null if not yet loaded / unavailable. */
export function getPigImage(): HTMLImageElement | null {
  if (!loadAttempted) {
    loadPigImage();
  }
  return pigImage;
}

/** Register a callback to be called when the pig image finishes loading. */
export function onPigImageLoad(cb: () => void): () => void {
  onLoadCallbacks.push(cb);
  return () => {
    const idx = onLoadCallbacks.indexOf(cb);
    if (idx >= 0) onLoadCallbacks.splice(idx, 1);
  };
}
