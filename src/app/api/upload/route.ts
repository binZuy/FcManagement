import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

// POST /api/upload
// Nhận file ảnh từ formData (hỗ trợ lưu local public/uploads hoặc Supabase Storage)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    // Cho phép upload nếu đã đăng nhập
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập để tải ảnh" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file tải lên" }, { status: 400 });
    }

    // Kiểm tra định dạng ảnh
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Chỉ chấp nhận file định dạng hình ảnh" }, { status: 400 });
    }

    // Giới hạn kích thước file 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Kích thước ảnh tối đa là 10MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Tạo tên file unique
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

    // 1. Kiểm tra nếu có cấu hình Supabase Storage Bucket
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zuplxrabnznwjdxsrbhc.supabase.co";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseKey) {
      try {
        const uploadUrl = `${supabaseUrl}/storage/v1/object/fc-photos/${fileName}`;
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": file.type,
          },
          body: buffer,
        });

        if (res.ok) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/fc-photos/${fileName}`;
          return NextResponse.json({ url: publicUrl });
        }
      } catch (sbErr) {
        console.warn("[Upload] Supabase Storage upload failed, fallback to local:", sbErr);
      }
    }

    // 2. Fallback: Lưu vào thư mục public/uploads/
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${fileName}`;
    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Lỗi tải ảnh lên server" }, { status: 500 });
  }
}
