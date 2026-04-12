import { create } from "zustand";

type Theme = "light"|"dark"|null;
interface ThemeStore{
  theme: Theme;
  toggleTheme:()=>void;
}

export const useThemeStore = create<ThemeStore>((set)=>{
  if(typeof window !=="undefined"){ // 只在客户端执行
    const savedTheme = localStorage.getItem('theme') as Theme;
    if(savedTheme==='dark'){
      document.documentElement.classList.add('dark');
    }
  }
  return{
  theme: typeof window !== "undefined" && (localStorage.getItem('theme') as Theme)=== "dark" ?
  "dark" : "light",
  toggleTheme: ()=> 
    set((state)=>{
      const newTheme = state.theme === "light" ? "dark" : "light";
      document.documentElement.classList.toggle('dark', newTheme === "dark");
      localStorage.setItem('theme', newTheme);
      return {theme: newTheme}
    })
  };
})