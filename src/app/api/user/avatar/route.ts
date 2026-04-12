import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";
import { randomUUID } from "crypto";
import { Contact } from "lucide-react";

// bucket前缀，方便管理
const AVATAR_FOLDER = "avatars";

export async function POST(req: NextRequest){
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  // 删除旧头像（如果存在）
  const user = await prisma.user.findUnique({
    where:{ id:session.user.id},
    select:{image:true},
  });
  if(user?.image?.includes(PHOTO_BUCKET)){
    // 提取
    // PHOTO_BUCKET 是头像文件夹常量，自己定的
    const parts = user.image.split(`${PHOTO_BUCKET}/`);
    if(parts[1]){
      await supabase.storage.from(PHOTO_BUCKET).remove([parts[1]]);
    }
  }
  // 上传新头像
// 取文件扩展名，如果没有点，默认jpg
// 格式限制在前端accept属性
  const ext = file.name.split(".").pop() ?? "jpg";
  const key = `${AVATAR_FOLDER}/${session.user.id}/${randomUUID()}.${ext}`;
  // buffer就是图片文件的二进制数据，arrayBuffer 自带方法把文件转成二进制
  const buffer = Buffer.from(await file.arrayBuffer()); // 需要Node，js的Buffer类型

  const {error: uploadError} = await supabase.storage.from(PHOTO_BUCKET).upload(key, buffer, {contentType: file.type, upsert: false});
  if(uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(key);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: publicUrl },
  });
  return NextResponse.json({ image: publicUrl });
}