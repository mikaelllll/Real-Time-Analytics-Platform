import type { LucideIcon } from 'lucide-react'

export function MetricCard({icon:Icon,label,value,detail}:{icon:LucideIcon;label:string;value:string;detail:string}) {
  return <article className="metric-card"><div className="metric-icon"><Icon size={19}/></div><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></article>
}
