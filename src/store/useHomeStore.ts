import { create } from 'zustand'

type ViewMode = 'calendar' | 'timeline'
interface HomeStore {
  viewMode: ViewMode,
  startDate: Date | undefined,
  setViewMode: (val:ViewMode)=>void,
  setStartDate: (date:Date|undefined)=>void,
}

export const useHomeStore = create<HomeStore>((set)=>({
  // 状态
  viewMode: 'calendar',
  startDate: undefined,
  // 动作
  setViewMode: (val:ViewMode)=>set({viewMode: val}),
  setStartDate: (date:Date|undefined)=>set({startDate: date}),
})
)