import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { T } from "../components/shared/Theme";
import { useSkuData } from "../api/hooks";

export default function ComponentSkuDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useSkuData();

  if (loading) return <div style={{padding:40,color:T.t2,fontFamily:"'Outfig',sans-serif"}}>Loading component detail...</div>;
  if (error) return <div style={{padding:40,color:T.rd}}>Error: {error}</div>;

  const component = data?.find(s => String(s.component_id || s.id) === String(id));

  return (
    <div style={{padding:"28px 32px",fontFamily:"'Outfig',sans-serif",color:T.tx,maxWidth:1200}}>
      <h2 style={{fontSize:18,fontWeight:700,margin:0,color:T.tx}}>
        Component Detail: {component ? component.name : id}
      </h2>
      <div style={{marginTop:20,padding:20,background:T.sf,borderRadius:10,border:"1px solid "+T.bd}}>
        {component ? (
          <div>
            <p><b>Name:</b> {component.name}</p>
            <p><b>Channel:</b> {component.channel}</p>
            <p><b>Units 30d:</b> {component.units_30d || component.units30d}</p>
            <p><b>Buybox Price:</b> ${(component.buybox_price || component.buyboxPrice || 0).toFixed(2)}</p>
            <p><b>Margin:</b> {((component.margin || 0) * 100).toFixed(1)}%</p>
            <p><b>Status:</b> {component.status || component.lifecycle || "N/A"}</p>
          </div>
        ) : <p style={{color:T.t3}}>Component not found</p>}
      </div>
      <div style={{marginTop:20}}>
        <button onClick={() => navigate("/sku-velocity")} style={{padding:"8px 14px",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer",border:"1px solid "+T.bd,background:T.bg,color:T.t2}}>
          \u2190 Back
        </button>
      </div>
    </div>
  );
}
