// Cloudinary URL ko chhota aur light (webp/avif) bana deta hai
export const optimizeImg = (url, w = 400) =>
  url && url.includes('/upload/') ? url.replace('/upload/', `/upload/f_auto,q_auto,w_${w}/`) : url;