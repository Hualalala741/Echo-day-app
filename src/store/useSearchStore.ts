import { create } from 'zustand'
import type { EntryPreview } from '@/app/home/HomeClient'
interface SearchStore{
  query: string,
  results: EntryPreview[],
  setQuery: (query: string) => void,
  setResults: (results: EntryPreview[]) => void,
  reset: () => void,
  open: boolean,
  setOpen: (open: boolean) => void,
}
export const useSearchStore = create<SearchStore>((set)=>({
    open: false,
    query: "",
    results:[],
    setQuery:(query)=>set({query}),
    setResults:(results)=>set({results}),
    setOpen:(open)=>set({open}),
    reset:()=>set({query:"", results:[]}),
    
})
)