import { create } from 'zustand'

export const useSearchStore = create((set)=>{
  return {
    query: "",
    results:[],
    setQuery:(query)=>set({query}),
    setResults:(results)=>set({results}),
    reset:()=>set({query:"", results:[]}),
  }
})