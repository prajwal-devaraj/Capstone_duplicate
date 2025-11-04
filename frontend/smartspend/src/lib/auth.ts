const KEY = 'ss_user'
const ONB = 'ss_onboarding' // 'none' | 'balance' | 'pay' | 'bills' | 'done'

export const getUser = () => { try { return JSON.parse(localStorage.getItem(KEY)||'null') } catch { return null } }
export const setUser = (u:any) => localStorage.setItem(KEY, JSON.stringify(u))
export const clearUser = () => { localStorage.removeItem(KEY); setOnboarding('none') }
export const isAuthed = () => !!getUser()

export const getOnboarding = ():string => localStorage.getItem(ONB) || 'none'
export const setOnboarding = (s:string) => localStorage.setItem(ONB, s)
