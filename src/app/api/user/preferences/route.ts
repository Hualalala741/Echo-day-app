import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";


// 获取偏好
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  return NextResponse.json({preferredLang: user?.preferredLang ?? 'en'});
}

// 更新偏好

export async function PATCH(req: NextRequest){
  const session = await auth();
  if(!session?.user?.id) return NextResponse.json({error: "Unauthorized"}, {status: 401});

  const {preferredLang} = await req.json();
  if(!preferredLang || !['en', 'zh'].includes(preferredLang)) return NextResponse.json({error: "Invalid preferred language"}, {status: 400});
  await prisma.user.update({
    where: {id: session.user.id},
    data: {preferredLang},
  });
  return NextResponse.json({preferredLang});
}