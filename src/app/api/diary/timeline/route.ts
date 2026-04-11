import {auth} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 2;

// GET /api/diary/timeline
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor"); //ISO 日期字符串，表示"从这个时间点往更早的方向取数据" 
  const startDate = searchParams.get("startDate");

  // 构造Prisma where条件
  // 基础条件：当前用户+状态为Complete
  const where: Record<string, any> = {
    userId: session.user.id,
    status: "COMPLETE",
  };

  // 如果有cursor，则添加日期范围条件
  if (cursor) {
    // 取比cursor更早的日记，所以用lt小于
    where.date = { lt: new Date(cursor) };
  }else if (startDate) {
    const d = new Date(startDate+ "T23:59:59.999Z"); // 包含选中当天
    where.date = { lte: d };
  }
  // 查询数据

  const entries = await prisma.diaryEntry.findMany({
    where,
    select:{
      id: true,
      date: true,
      moodEmoji: true,
      moodColorHex: true,
      emotionLabel: true,
      photoUrl: true,
      diaryText: true,
      spotifyTrackName: true,
      spotifyArtist: true,
    },
    orderBy: { date: "desc" },
    take: PAGE_SIZE+1,   // 多取一个用来判断后面还有没有更多的数据
  });

  // 判断是否还有更多数据
  const hasMore = entries.length > PAGE_SIZE;
  const data = hasMore ? entries.slice(0, PAGE_SIZE) : entries;
  // 下一页的 cursor = 这一页最后一条的日期
  const nextCursor = hasMore ? data[data.length-1].date.toISOString() : null;
  // 序列化数据
  const serialized = {
    entries: data.map((e) => ({
    ...e,
    date: e.date.toISOString(),
    })),
    nextCursor,
  };
  return NextResponse.json(serialized);
}