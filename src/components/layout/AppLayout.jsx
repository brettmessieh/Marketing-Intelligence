import { Outlet } from "react-router-dom";
import { T } from "../shared/Theme";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  return (
    <div
      style={{
        display: "flex",
        background: T.bg,
        color: T.tx,
        minHeight: "100vh",
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 24px",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
