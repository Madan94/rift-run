import { cellKey, type Cell, type VenueMap as Venue } from "@riftrun/world-protocol";
type Props = { map: Venue; cells: Cell[]; selected?: string; onSelect?: (id: string) => void; runner?: { x: number; y: number }; compact?: boolean };
export function VenueMap({ map, cells, selected, onSelect, runner, compact }: Props) {
  const t = 24;
  return <svg className={`venue-map ${compact ? "compact" : ""}`} viewBox={`0 0 ${map.width * t} ${map.height * t}`} aria-label="Playable ETHGlobal Mumbai venue adaptation" role="img">
    <defs>
      <pattern id="floor-grid" width={t} height={t} patternUnits="userSpaceOnUse"><path d={`M ${t} 0 L 0 0 0 ${t}`} fill="none" stroke="#a56271" strokeOpacity=".12" strokeWidth=".7" /></pattern>
      <pattern id="desk-grid" width="22" height="20" patternUnits="userSpaceOnUse"><rect width="15" height="9" x="3" y="5" rx="1" fill="#006d8b" opacity=".15" /></pattern>
    </defs>
    <rect x="0" y="0" width={map.width * t} height={map.height * t} rx="12" fill="#381420" />
    <rect x="14" y="14" width={map.width * t - 28} height={map.height * t - 28} rx="3" fill="url(#floor-grid)" stroke="#d3adba" strokeOpacity=".3" />
    {map.zones.map(z => <g key={`${z.x},${z.y}`}>
      <rect x={z.x * t + 2} y={z.y * t + 2} width={z.w * t - 4} height={z.h * t - 4} rx="2" fill={z.color} />
      {z.label.includes("HACK") && <rect x={z.x * t + 4} y={z.y * t + 4} width={z.w * t - 8} height={z.h * t - 8} fill="url(#desk-grid)" />}
      {z.w > 2 && z.h > 2 && <circle cx={(z.x + z.w / 2) * t} cy={(z.y + z.h / 2) * t - 19} r="12" fill="#fff9ed" opacity=".9" />}
      <text x={(z.x + z.w / 2) * t} y={(z.y + z.h / 2) * t + (z.w > 2 && z.h > 2 ? 8 : 2)} textAnchor="middle" fill="#211629" fontSize={z.w <= 3 || z.h <= 1 ? 7.5 : 12} fontWeight="800" letterSpacing=".6" transform={z.w === 1 ? `rotate(-90 ${(z.x + .5) * t} ${(z.y + z.h / 2) * t})` : undefined}>
        {z.label.split("\n").map((line, i) => <tspan key={line} x={(z.x + z.w / 2) * t} dy={i ? 15 : 0}>{line}</tspan>)}
      </text>
    </g>)}
    {map.gaps.map(g => <g key={cellKey(g)}><rect x={g.x * t + 1} y={g.y * t + 1} width={t - 2} height={t - 2} fill="#100a14" stroke="#ffbd61" strokeDasharray="3 3" /><path d={`M${g.x * t + 5},${g.y * t + 17}l5,-12l4,10l5,-9`} stroke="#f095e0" fill="none" strokeWidth="1.8" /></g>)}
    {map.sites.map(site => {
      const active = cells.find(c => c.x === site.x && c.y === site.y);
      return <g key={site.id} className={`edit-site ${selected === site.id ? "selected" : ""}`} role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined} aria-label={`${site.label}: ${site.kind.toLowerCase()} ${active ? "active" : "site"}`} onClick={() => onSelect?.(site.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(site.id); } }}>
        <rect x={site.x * t - 5} y={site.y * t - 5} width={t + 10} height={t + 10} rx="6" fill={active ? active.kind === "BRIDGE" ? "#99e7bd" : "#ff8e73" : "#ffe0a7"} fillOpacity={active ? .95 : .15} stroke={selected === site.id ? "#fff5de" : site.kind === "BRIDGE" ? "#99e7bd" : "#ff8e73"} strokeWidth={selected === site.id ? 3 : 1.5} />
        <text x={(site.x + .5) * t} y={(site.y + .5) * t + 5} textAnchor="middle" fill={active ? "#28121d" : "#fff2dd"} fontSize="17" fontWeight="900">{site.kind === "BRIDGE" ? "+" : "×"}</text>
      </g>;
    })}
    <text x={map.spawn.x * t} y={(map.spawn.y + 2) * t} fill="#fff1db" fontSize="10" fontWeight="800">↑ ENTRY</text>
    <circle cx={(map.finish.x + .5) * t} cy={(map.finish.y + .5) * t} r="9" fill="#422037" stroke="#fff4d8" strokeWidth="3" />
    <text x={(map.finish.x + .5) * t} y={(map.finish.y + 2.2) * t} textAnchor="middle" fill="#2d2032" fontSize="8" fontWeight="900">FINISH</text>
    {runner && <g transform={`translate(${runner.x * t},${runner.y * t})`}><circle r="12" fill="#ffe0a7" opacity=".18" /><circle r="6" fill="#fff4dc" stroke="#20101c" strokeWidth="2" /><path d="M-2 -2h4v4h-4z" fill="#ff784a" /></g>}
  </svg>;
}
