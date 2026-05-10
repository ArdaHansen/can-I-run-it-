export const maxUploadBytes = 5 * 1024 * 1024;
export const allowedImageTypes = ['image/png', 'image/jpeg', 'image/webp'];

export function isSafeImage(file: File) {
  return allowedImageTypes.includes(file.type) && file.size <= maxUploadBytes;
}
