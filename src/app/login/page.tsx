"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Sparkles,Eye, EyeOff, Loader2  } from "lucide-react";


export default function LoginPage() {
  
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
  }


  async function handleGoogleSignIn() {
    setIsLoading(true);
    await signIn("google", { callbackUrl: "/home" });
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email||!password||(mode === "register" && !name)) return;
    setIsLoading(true);
    setError(null);
    try {
      if(mode === "register"){
        const res = await fetch("/api/auth/register",{
          method: "POST",
          headers:{"Content-Type": "application/json"},
          body: JSON.stringify({email,password,name})
        })
        if(!res.ok){
          const data = await res.json();
          throw new Error(data.error?? "Registration failed");
        }
        
      }
      // 登录
      const result = await signIn("credentials",{
        email,
        password,
        redirect: false,
      });
      if(result?.error){
        throw new Error(mode === "login" ? "Invalid email or password" : 
          "Account created but login failed. Please try logging in.");
      }
      //会触发浏览器的完整页面刷新。
      //这次请求会带上刚设置好的新 cookie，middleware 正确识别到你已登录，服务端渲染也能拿到正确的 session
      window.location.href = "/home";
    
    }catch(error){
      setError((error as Error).message);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4">
      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg shadow-indigo-100/60 px-10 py-12">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-[#0f58bd]" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Echo Day</h1>
            <p className="mt-1.5 text-sm text-slate-400">
              
              {mode === "register" ? "Start capturing your memories" : "Welcome back to your memories"}
            </p>
          </div>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-slate-400">or email sign in</span>
          </div>
        </div>
        {error && (
  <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-sm text-red-600">
    {error}
  </div>
)}

        {/* Email Sign In */}
        <form onSubmit={handleEmailSignIn} className="space-y-3">
          {/* 邮箱 */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>
            {mode==="register" && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e)=>setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
            )}

          {/* 密码 */}
          <div>
            <label htmlFor='password' className="block text-sm font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            </div>

          </div>


{/* 提交按钮 */}
          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full h-12 rounded-xl bg-[#0d4a9f] text-sm font-semibold text-white hover:bg-[#0f58bd]/80 active:bg-[#0f58bd]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
              mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center mt-6 text-center space-y-3">
        <p className="text-sm text-slate-500">
          {mode === "login" ? "New to Echo Day?" : "Already have an account?"}
          <button
            onClick={switchMode}
            className="ml-2 font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            {mode === "login" ? "Create an account" : "Sign In"}
          </button>
        </p>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <button className="hover:text-slate-600 transition-colors">Privacy Policy</button>
          <button className="hover:text-slate-600 transition-colors">Terms of Service</button>
          <button className="hover:text-slate-600 transition-colors">Help Center</button>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
