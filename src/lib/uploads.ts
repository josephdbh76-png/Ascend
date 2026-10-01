// What each kind of file upload accepts. Client-safe: the browser checks
// these before sending, the server checks them again before signing the
// upload and once more on the stored file.

export type UploadKind = "admin-media" | "avatar" | "training-cover" | "revenue-proof" | "opportunity-attachment";

const IMAGES = ["image/png", "image/jpeg", "image/webp"];

export interface UploadRule {
  bucket: string;
  maxBytes: number;
  types: string[];
  typesLabel: string;
  /** Images larger than this (longest side, px) are scaled down in the browser first. */
  imageMaxSide?: number;
  publicBucket: boolean;
}

const MB = 1024 * 1024;

export const UPLOAD_RULES: Record<UploadKind, UploadRule> = {
  "admin-media": { bucket: "admin-media", maxBytes: 5 * MB, types: IMAGES, typesLabel: "JPG, PNG ou WebP", imageMaxSide: 2400, publicBucket: true },
  avatar: { bucket: "avatars", maxBytes: 5 * MB, types: IMAGES, typesLabel: "JPG, PNG ou WebP", imageMaxSide: 800, publicBucket: true },
  "training-cover": { bucket: "training-covers", maxBytes: 5 * MB, types: IMAGES, typesLabel: "JPG, PNG ou WebP", imageMaxSide: 2000, publicBucket: true },
  "revenue-proof": {
    bucket: "revenue-proofs",
    maxBytes: 10 * MB,
    // CSV: the payments export of Whop, Stripe, Gumroad...
    types: ["application/pdf", ...IMAGES, "text/csv", "application/vnd.ms-excel"],
    typesLabel: "PDF, image ou export CSV",
    imageMaxSide: 2800,
    publicBucket: false,
  },
  "opportunity-attachment": {
    bucket: "opportunity-attachments",
    maxBytes: 10 * MB,
    types: [
      "application/pdf",
      ...IMAGES,
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    typesLabel: "PDF, Word ou image",
    imageMaxSide: 2800,
    publicBucket: false,
  },
};

export const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "text/csv": "csv",
  "application/vnd.ms-excel": "csv",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export function megabytes(bytes: number) {
  return `${Math.round(bytes / MB)} Mo`;
}
