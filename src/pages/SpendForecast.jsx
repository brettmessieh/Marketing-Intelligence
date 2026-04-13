import { useState, useMemo } from "react";
import { useSpendForecast } from "../api/hooks";
import { T, fm, fc } from "../components/shared/Theme";

// Channel colors
const CHANNEL_COLORS = {
  amazon: "#FF9900",
  sven: "#60a5fa",
  sleepgeekj: "#34d399",
  celestial: "#a78bfa",
  walmart: "#22d3ee",
};
