/**
 * 日历 hover 等小预览场景：对 Supabase Storage 公链使用 render 端点缩小体积。
 * 非 Supabase 或已是签名/特殊 URL 时原样返回。
 */
export function getCalendarHoverPhotoUrl(photoUrl: string): string {
  try {
    const u = new URL(photoUrl);
    if (!u.hostname.endsWith("supabase.co")) return photoUrl;

    const marker = "/storage/v1/object/public/";
    if (!u.pathname.includes(marker)) return photoUrl;

    u.pathname = u.pathname.replace(marker, "/storage/v1/render/image/public/");
    if (!u.search) {
      u.searchParams.set("width", "416");
      u.searchParams.set("height", "200");
      u.searchParams.set("resize", "cover");
      u.searchParams.set("quality", "78");
    }
    return u.toString();
  } catch {
    return photoUrl;
  }
}
