import { useState, useMemo } from "react";
import { T } from "../components/shared/Theme";
import { recommendAllocation, CHANNEL_CONFIG, DEFAULT_BUDGETS, MARGIN, getSpendMultiplier } from "../api/allocator";

const fc = (v) => "$" + Number(v).toLocaleString(undefined, {minimumFractionDigits:0,maximumFractionDigits:0});

export default function SpendAllocator() {
  const [totalBudget, setTotalBudget] = useState(17434);
  const [maxMER, setMaxMER] = useState(16);
  const [budgets, setBudgets] = useState({...DEFAULT_BUDGETS});

  const result = useMemo(() => recommendAllocation(totalBudget, maxMER, 1), [totalBudget, maxMER]);

  const handleSlider = (ch, val) => {
    setBudgets(prev => ({...prev, [ch]: Number(val)}));
  };

  const channels = Object.entries(CHANNEL_CONFIG);

  return (
    <div style={{padding:"28px 32px",fontFamily:"'Outfig',sans-serif",color:T.tx,maxWidth:1200}}>
      <h2 style={{fontSize:18,fontWeight:700,margin:"0 0 20px"}}>Spend Allocator</h2>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
        <div style={{padding:20,background:T.sf,borderRadius:10,border:"1px solid "+T.bd}}>
          <label style={{fontSize:10,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>Daily Budget</label>
          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8}}>
            <input type="range" min={5000} max={50000} step={500} value={totalBudget} onChange={e=>setTotalBudget(Number(e.target.value))} style={{flex:1}} />
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:16}}>{fc(totalBudget)}</span>
          </div>
        </div>
        <div style={{padding:20,background:T.sf,borderRadius:10,border:"1px solid "+T.bd}}>
          <label style={{fontSize:10,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>Max MER Ceiling</label>
          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8}}>
            <input type="range" min={5} max={30} step={0.5} value={maxMER} onChange={e=>setMaxMER(Number(e.target.value))} style={{flex:1}} />
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:16}}>{maxMER}%</span>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:24}}>
        {[
          ["Projected Revenue", fc(result.predictions.totalRevenue)],
          ["ROAS", result.predictions.roas + "x"],
          ["MER", result.predictions.mer + "%"],
          ["Gross Contrib", fc(result.predictions.grossContrib)],
          ["LTV Contrib", fc(result.predictions.ltvContrib)],
        ].map(([label, val]) => (
          <div key={label} style={{padding:16,background:T.sf,borderRadius:10,border:"1px solid "+T.bd,textAlign:"center"}}>
            <div style={{fontSize:9,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>
            <div style={{fontSize:18,fontWeight:700,marginTop:6,color:T.ac,fontFamily:"'JetBrains Mono',monospace"}}>{val}</div>
          </div>
        ))}
      </div>

      <h3 style={{fontSize:13,fontWeight:700,margin:"0 0 12px"}}>Channel Allocation</h3>
      <div style={{display:"grid",gap:12}}>
        {channels.map(([ch, cfg]) => (
          <div key={ch} style={{padding:16,background:T.sf,borderRadius:10,border:"1px solid "+T.bd,display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:100,fontWeight:700,fontSize:12,color:cfg.color}}>{cfg.label}</div>
            <input type="range" min={cfg.sliderMin} max={cfg.sliderMax} step={cfg.sliderStep} value={result.allocation[ch]||0} readOnly style={{flex:1}} />
            <div style={{width:80,textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:13}}>{fc(result.allocation[ch]||0)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
