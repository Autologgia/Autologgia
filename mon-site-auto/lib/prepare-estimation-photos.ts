import { MAX_PHOTOS, MAX_PHOTO_BYTES, MAX_TOTAL_PHOTO_BYTES, type EstimationPhoto } from "@/lib/estimation-photos";

function base64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Impossible de lire une photo. Sélectionnez-la à nouveau."));
    reader.onabort = () => reject(new Error("Lecture des photos interrompue."));
    reader.readAsDataURL(blob);
  });
}

export async function prepareEstimationPhotos(files: FileList): Promise<EstimationPhoto[]> {
  if (files.length > MAX_PHOTOS) throw new Error("Sélectionnez au maximum 4 photos.");
  const budget = Math.floor(MAX_TOTAL_PHOTO_BYTES / Math.max(1, files.length));
  const result: EstimationPhoto[] = [];
  for (const file of Array.from(files)) {
    if (!/\.(jpe?g|png|webp)$/i.test(file.name) || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error("Choisissez des photos JPG, PNG ou WebP.");
    }
    if (file.size > MAX_PHOTO_BYTES) throw new Error(`La photo « ${file.name} » dépasse 3 Mo. Réduisez sa taille avant de la joindre.`);
    let blob: Blob = file, filename = file.name;
    if (file.size > budget) {
      const bitmap = await createImageBitmap(file).catch(() => { throw new Error(`La photo « ${file.name} » est illisible.`); });
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Impossible de préparer les photos sur ce navigateur.");
        // WebP retains alpha for PNG/WebP inputs; JPEG remains JPEG.
        const type = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
        for (const maxSide of [1600, 1280, 1024]) {
          const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
          canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
          canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
          context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Impossible de réduire une photo.")), type, 0.86));
          if (blob.size <= budget) break;
        }
        if (blob.size > budget) throw new Error("Photos encore trop volumineuses. Réduisez leur taille ou sélectionnez-en moins (2,5 Mo au total).");
        filename = file.name.replace(/\.[^.]+$/, blob.type === "image/jpeg" ? ".jpg" : blob.type === "image/webp" ? ".webp" : ".png");
      } finally { bitmap.close(); }
    }
    result.push({ filename, content: await base64(blob) });
  }
  return result;
}
