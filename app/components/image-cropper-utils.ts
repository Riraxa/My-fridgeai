export const CROP_SIZE = 200;
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 3;

export function calculateDisplaySize(
  naturalWidth: number,
  naturalHeight: number,
  cropSize: number,
) {
  const aspectRatio = naturalWidth / naturalHeight;
  if (aspectRatio > 1) {
    return { width: cropSize * aspectRatio, height: cropSize };
  }
  return { width: cropSize, height: cropSize / aspectRatio };
}

export function constrainPosition(
  position: { x: number; y: number },
  imageSize: { width: number; height: number },
  scale: number,
  cropSize: number,
) {
  const scaledWidth = imageSize.width * scale;
  const scaledHeight = imageSize.height * scale;
  const maxOffsetX = scaledWidth > cropSize ? (scaledWidth - cropSize) / 2 : 0;
  const maxOffsetY = scaledHeight > cropSize ? (scaledHeight - cropSize) / 2 : 0;
  return {
    x: Math.max(-maxOffsetX, Math.min(maxOffsetX, position.x)),
    y: Math.max(-maxOffsetY, Math.min(maxOffsetY, position.y)),
  };
}

export function calculateSourceRect(
  imageSize: { width: number; height: number },
  scale: number,
  position: { x: number; y: number },
  naturalWidth: number,
  cropSize: number,
) {
  const ratio = naturalWidth / imageSize.width;
  const scaledWidth = imageSize.width * scale;
  const scaledHeight = imageSize.height * scale;
  const previewLeft = cropSize / 2 + position.x - scaledWidth / 2;
  const previewTop = cropSize / 2 + position.y - scaledHeight / 2;
  return {
    sourceX: ((0 - previewLeft) / scale) * ratio,
    sourceY: ((0 - previewTop) / scale) * ratio,
    sourceWidth: (cropSize / scale) * ratio,
    sourceHeight: (cropSize / scale) * ratio,
  };
}
