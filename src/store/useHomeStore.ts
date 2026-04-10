import { create } from 'zustand'

type ViewMode = 'calendar' | 'timeline'
interface HomeStore {
  viewMode: ViewMode,
  setViewMode: (val:ViewMode)=>void,
}

export const useHomeStore = create<HomeStore>((set)=>({
  // 状态
  viewMode: 'calendar',
  // 动作
  setViewMode: (val:ViewMode)=>set({viewMode: val}),
})
)