/** Basispad van de site (GitHub Pages publiceert onder /<repository>/). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const asset = (p: string) => `${BASE_PATH}${p}`;
