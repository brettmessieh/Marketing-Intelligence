import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { T } from "../components/shared/Theme";
import { useSkuData } from "../api/hooks";

export default function SkuVelocityDetail() {
  const { asin } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useSkuData();

  if (loading) return <div style={{padding:40,color:T.t2}}>Loading SKU detail...</div>;
  if (error) return <div style={{padding:40,color:T.rd}}>Error: {error}</div>;

  const sku = data?.find(s => s.asinId === asin || s.asin_id === asin);

  const fc = (v) => v != null ? "$" + Number(v).toLocaleString(undefined, {minimumFractionDigits:2,maximumFractionDigits:2}) : "N/A";
  const fp = (v) => v != null ? (Number(v) * 100).toFixed(1) + "%" : "N/A";

  return (
    <div style={{padding:"28px 32px",fontFamily:"'Outfig',sans-serif",color:T.tx,maxWidth:1200}}>
      <h2 style={{fontSize:18,fontWeight:700,margin:0}}>{sku ? sku.name : "SKU " + asin}</h2>
      <p style={{color:T.t3,fontSize:11,margin:"4px 0 20px"}}>ASIN: {asin}</p>
      
      {sku ? (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>
          {[
            ["Channel", sku.channel],
            ["Buybox Price", fc(sku.buyboxPrice || sku.buybox_price)],
            ["Velocity (30d)", (sku.velocity30d || sku.velocity_30d || 0).toFixed(2) + " units/day"],
            ["Units (30d)", sku.units30d || sku.units_30d || 0],
            ["Margin", fp(sku.margin)],
            ["Contribution", fc(sku.contribution)],
            ["CVR", (sku.cvr || 0).toFixed(2) + "%"],
            ["Lifecycle", sku.lifecycle || "N/A"],
          ].map(([label, val]) => (
            <div key={label} style={{padding:16,background:T.sf,borderRadius:10,border:"1px solid "+T.bd}}>
              <div style={{fontSize:9,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>
              <div style={{fontSize:16,fontWeight:700,marginTop:6,color:T.tx,fontFamily:"'JetBrains Mono',monospace"}}>{val}</div>
            </div>
          ))}
        </div>
      ) : <div style={{padding:20,background:T.sf,borderRadius:10,border:"1px solid "+T.bd,color:T.t3}}>SKU not found</div>}
      
      <div style={{marginTop:20}}>
        <button onClick={() => navigate("/sku-velocity")} style={{padding:"8px 14px",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer",border:"1px solid "+T.bd,background:T.bg,color:T.t2}}>
          \u2190 Back to Overview
        </button>
      </div>
    </div>
  );
}
