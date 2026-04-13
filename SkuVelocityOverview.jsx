import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { T } from "../components/shared/Theme";
import { useSkuData } from "../api/hooks";

const fc = (v) => "$" + Number(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
const fp = (v) => (Number(v) * 100).toFixed(1) + "%";

export default function SkuVelocityOverview() {
  const navigate = useNavigate();
  const { data, loading, error } = useSkuData();
  const [sortKey, setSortKey] = useState("contribution");
  const [sortDir, setSortDir] = useState("desc");
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterLifecycle, setFilterLifecycle] = useState("all");

  const skus = useMemo(() => {
    if (!data) return [];
    let filtered = [...data];
    if (filterChannel !== "all") filtered = filtered.filter(s => s.channel === filterChannel);
    if (filterLifecycle !== "all") filtered = filtered.filter(s => (s.lifecycle || "").toLowerCase() === filterLifecycle);
    filtered.sort((a, b) => {
      const av = a[sortKey] || 0, bv = b[sortKey] || 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return filtered;
  }, [data, sortKey, sortDir, filterChannel, filterLifecycle]);

  const channels = useMemo(() => data ? [...new Set(data.map(s => s.channel))] : [], [data]);
  const lifecycles = useMemo(() => data ? [...new Set(data.map(s => s.lifecycle).filter(Boolean))] : [], [data]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  if (loading) return <div style={{padding:40,color:T.t2}}>Loading SKU data...</div>;
  if (error) return <div style={{padding:40,color:T.rd}}>Error: {error}</div>;

  const cols = [
    { key: "name", label: "Product", align: "left" },
    { key: "channel", label: "Channel", align: "left" },
    { key: "velocity30d", label: "Velocity", align: "right", fmt: v => (v||0).toFixed(2) },
    { key: "units30d", label: "Units 30d", align: "right" },
    { key: "buyboxPrice", label: "Price", align: "right", fmt: v => fc(v||0) },
    { key: "margin", label: "Margin", align: "right", fmt: v => fp(v||0) },
    { key: "contribution", label: "Contribution", align: "right", fmt: v => fc(v||0) },
    { key: "cvr", label: "CVR", align: "right", fmt: v => (v||0).toFixed(2) + "%" },
    { key: "lifecycle", label: "Lifecycle", align: "left" },
  ];

  return (
    <div style={{padding:"28px 32px",fontFamily:"'Outfig',sans-serif",color:T.tx}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontSize:18,fontWeight:700,margin:0}}>SKU Velocity Overview</h2>
        <div style={{display:"flex",gap:8}}>
          <select value={filterChannel} onChange={e=>setFilterChannel(e.target.value)} style={{padding:"6px 10px",borderRadius:6,border:"1px solid "+T.bd,background:T.sf,color:T.tx,fontSize:11}}>
            <option value="all">All Channels</option>
            {channels.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterLifecycle} onChange={e=>setFilterLifecycle(e.target.value)} style={{padding:"6px 10px",borderRadius:6,border:"1px solid "+T.bd,background:T.sf,color:T.tx,fontSize:11}}>
            <option value="all">All Lifecycles</option>
            {lifecycles.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <div style={{overflowX:"auto",borderRadius:10,border:"1px solid "+T.bd}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead>
            <tr style={{background:T.sf}}>
              {cols.map(c => (
                <th key={c.key} onClick={()=>toggleSort(c.key)} style={{padding:"10px",textAlign:c.align,cursor:"pointer",fontWeight:600,color:T.t3,fontSize:9,textTransform:"uppercase",letterSpacing:0.5,borderBottom:"1px solid "+T.bd}}>
                  {c.label} {sortKey===c.key ? (sortDir==="asc"?"\u25B2":"\u25BC") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {skus.map((sku, i) => (
              <tr key={i} onClick={()=>navigate("/sku-velocity/"+encodeURIComponent(sku.asinId||sku.asin_id||i))} style={{cursor:"pointer",borderBottom:"1px solid "+T.bd,background:i%2===0?T.bg:T.sf}} onMouseEnter={e=>e.currentTarget.style.background=T.bd} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.bg:T.sf}>
                {cols.map(c => (
                  <td key={c.key} style={{padding:"8px 10px",textAlign:c.align,color:T.tx,fontFamily:c.align==="right"?"'JetBrains Mono',monospace":"inherit",fontWeight:c.align==="right"?600:400}}>
                    {c.fmt ? c.fmt(sku[c.key]) : (sku[c.key] || "N/A")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{fontSize:10,color:T.t3,marginTop:12}}>{skus.length} SKUs shown</p>
    </div>
  );
}
