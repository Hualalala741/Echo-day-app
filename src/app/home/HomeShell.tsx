"use client";

import { useState, useRef } from "react";
import { Sparkles, Globe, Camera, Sun, Moon, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "next-auth/react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SearchOverlay from "@/components/home/SearchOverlay";
import { Spinner } from "@/components/ui/spinner";
import { useThemeStore } from "@/store/useThemeStore";

interface Props {
  user: { name: string | null; email: string | null; image: string | null };
  children: React.ReactNode;
}

export function HomeShell({ user, children }: Props) {
  const { theme, toggleTheme } = useThemeStore();
  const [lang, setLang] = useState<"en" | "zh">("en");
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.image ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const firstName = user.name?.split(" ")[0] ?? "there";
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  function handleLangChange(newLang: "en" | "zh") {
    setLang(newLang);
    fetch("/api/user/preferences", {
      method: "PATCH",
      body: JSON.stringify({ preferredLang: newLang }),
    }).catch(console.error);
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploading(true);
    const file = e.target.files?.[0];
    if (!file) { setUploading(false); return; }
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/user/avatar", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { image } = await res.json();
      setAvatarUrl(image);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-[100] bg-card border-b border-border px-6 md:px-10 lg:px-20">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand-foreground" strokeWidth={1.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">Echo Day</span>
          </div>
          <SearchOverlay />
          <div className="flex items-center gap-4">
            {/* New Entry 按钮移到 HomeContent 里 */}
            <div className="flex items-center gap-3 pl-3 border-l border-border">
              <div className="relative cursor-pointer">
                <DropdownMenu>
                  <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none hover:opacity-80 hover:scale-105 transition-all">
                    <Avatar className="w-10 h-10 border-2" style={{ borderColor: "var(--border)" }}>
                      <AvatarImage src={avatarUrl ?? undefined} />
                      <AvatarFallback className="text-sm font-semibold" style={{ backgroundColor: "color-mix(in srgb, var(--brand) 15%, transparent)", color: "var(--brand)" }}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-45 z-[200]">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal">
                        <p className="text-sm font-medium text-foreground">{user.name ?? "User"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </DropdownMenuLabel>
                      <DropdownMenuItem className="cursor-pointer">
                        {uploading ? (
                          <div className="flex items-center justify-center gap-2">
                            <Spinner className="w-4 h-4 mr-2" />Uploading...
                          </div>
                        ) : (
                          <div className="rounded-ful flex items-center justify-center" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                            <Camera className="w-4 h-4 mr-2" />Change Avatar
                          </div>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <div className="flex items-center px-2 gap-2">
                      <span className="text-sm font-medium text-foreground">Model Language</span>
                      <Globe className="w-4 h-4 mr-2" />
                    </div>
                    <div className="mx-2 my-1.5 flex items-center bg-muted rounded-lg p-0.5 gap-0.5" onClick={(e) => e.stopPropagation()}>
                      {(["en", "zh"] as const).map((l) => (
                        <button key={l} onClick={() => handleLangChange(l)} className={`flex-1 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${lang === l ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                          {l === "en" ? "English" : "中文"}
                        </button>
                      ))}
                    </div>
                    <DropdownMenuSeparator />
                    <div className="flex items-center px-2">
                      <span className="text-sm font-medium text-foreground">Theme</span>
                      <div className="mx-2 my-1.5 flex items-center bg-muted rounded-lg p-0.5 gap-0.5" onClick={(e) => e.stopPropagation()}>
                        {(["light", "dark"] as const).map((t) => (
                          <button key={t} onClick={() => { if (t !== theme) toggleTheme(); }} className={`flex-1 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${t === theme ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                            {t === "light" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} className="cursor-pointer">
                        <LogOut className="w-4 h-4 mr-2" />Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* LCP 元素 — 立刻渲染；底部少留白，让下方工具行贴近 */}
      <div className="px-6 md:px-10 lg:px-20 pt-6 sm:pt-8 pb-2">
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {firstName}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Here&apos;s your journal</p>
      </div>

      {children}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
    </div>
  );
}