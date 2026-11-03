// Keep the JSON (including base64's 4/3 expansion) below Vercel's 4.5 MB
// request limit. Leave room for fields, filenames and transport overhead.
export const ESTIMATION_BODY_LIMIT_BYTES = 4 * 1024 * 1024;
export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_TOTAL_PHOTO_BYTES = 2.5 * 1024 * 1024;
export type EstimationPhoto = { filename: string; content: string };
