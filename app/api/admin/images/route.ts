import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const BUCKET = "site-images";
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_FOLDERS = new Set(["events", "products"]);

type SupportedImage = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

function detectImage(bytes: Uint8Array): SupportedImage | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { contentType: "image/png", extension: "png" };
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }

  return null;
}

async function ensureImageBucket() {
  const supabase = getSupabaseAdmin();
  const { data: bucket, error: lookupError } = await supabase.storage.getBucket(BUCKET);

  if (!bucket) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      fileSizeLimit: MAX_FILE_SIZE,
    });
    if (createError) throw createError;
  } else if (!bucket.public) {
    const { error: updateError } = await supabase.storage.updateBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      fileSizeLimit: MAX_FILE_SIZE,
    });
    if (updateError) throw updateError;
  } else if (lookupError) {
    throw lookupError;
  }

  return supabase;
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated(req))) {
    return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const requestedFolder = formData.get("folder");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Selecciona una imatge" }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "La imatge ha de pesar menys de 4 MB" }, { status: 400 });
    }

    if (typeof requestedFolder !== "string" || !ALLOWED_FOLDERS.has(requestedFolder)) {
      return NextResponse.json({ error: "Carpeta d'imatges no vàlida" }, { status: 400 });
    }
    const folder = requestedFolder;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const image = detectImage(bytes);

    if (!image) {
      return NextResponse.json({ error: "El fitxer ha de ser una imatge PNG, JPG o WebP vàlida" }, { status: 400 });
    }

    const supabase = await ensureImageBucket();
    const now = new Date();
    const path = `${folder}/${now.getUTCFullYear()}/${randomUUID()}.${image.extension}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: image.contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path }, { status: 201 });
  } catch (err) {
    console.error("[Admin Images] Upload error:", err);
    return NextResponse.json({ error: "No s'ha pogut pujar la imatge" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated(req))) {
    return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
  }

  try {
    const body = await req.json() as { path?: unknown };
    const path = typeof body.path === "string" ? body.path : "";
    const validFolder = [...ALLOWED_FOLDERS].some((folder) => path.startsWith(`${folder}/`));

    if (!path || path.includes("..") || !validFolder) {
      return NextResponse.json({ error: "Ruta no vàlida" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Admin Images] Cleanup error:", err);
    return NextResponse.json({ error: "No s'ha pogut eliminar la imatge" }, { status: 500 });
  }
}
