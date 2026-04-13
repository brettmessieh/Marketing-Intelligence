# SSM Command Center — SKU Component Mapping

**Total Marketplace SKUs:** 167  
**Unique GEN Components:** 72  
**Generated:** 2026-04-12

---

## Product Line Summary

| Product Line | SKU Count |
|-------------|-----------|
| BCA | 7 |
| Bliss | 15 |
| CEL | 43 |
| Classic | 34 |
| Essential | 19 |
| Headboard | 3 |
| Other | 4 |
| Platinum | 25 |
| Standalone Mattress | 17 |

---

## Size Codes

| Code | Size | Notes |
|------|------|-------|
| TN | Twin | |
| TXL | Twin XL | Standard base unit for Split King |
| F | Full | |
| Q/QN | Queen | |
| K | King | |
| SK/SK-F | Split King | 2× TXL bases |
| SCK | Split Cal King | |
| CAK | Cal King | |
| SHQN | Short Queen | RV/specialty |

---

## Component Type Prefixes

| Prefix | Type | Example |
|--------|------|---------|
| GEN-AB-E- | Essential Adjustable Base | GEN-AB-E-TXL |
| GEN-AB-C- | Classic Adjustable Base (v1) | GEN-AB-C-Q |
| GEN-AB-C2- | Classic Adjustable Base (v2) | GEN-AB-C2-TXL |
| GEN-AB-H- | Classic H Adjustable Base | GEN-AB-H-Q |
| GEN-AB-B- | Bliss Adjustable Base (v1) | GEN-AB-B-TXL |
| GEN-AB-B2- | Bliss Adjustable Base (v2) | GEN-AB-B2-Q |
| GEN-AB-P- | Platinum Adjustable Base | GEN-AB-P-TXL |
| GEN-AB-P2- | Platinum Adjustable Base (v2) | GEN-AB-P2-Q |
| GEN-AB-A- | CEL Adjustable Base | GEN-AB-A-TXL |
| GEN-AB-ECL- | BCA Eclipse Adjustable Base | GEN-AB-ECL-Q |
| GEN-MATT-{n}- | CEL Mattress ({n} inch) | GEN-MATT-10-TXL |
| GEN-HB- | Headboard | GEN-HB-VT-GY-QNFL |
| SS{n}{size} | Standalone Mattress ({n}") | SS10QN, SS12K |

---

## Historical Component Reference

Historical components are the legacy vendor-specific SKUs that were used before the GEN- standardization:

| Historical SKU Pattern | Vendor | Current GEN Equivalent |
|----------------------|--------|----------------------|
| ML160F{size} | — | GEN-AB-E-{size} |
| NU106KD{size} | — | GEN-AB-E-{size} (secondary) |
| NU400{size} | — | GEN-AB-C-{size} |
| NL300F{size} | — | GEN-AB-C-{size} (secondary) |
| NU302SG{size} | — | GEN-AB-C-{size} (secondary) |
| NLP300F{size} | — | GEN-AB-C-{size} / GEN-AB-C2-{size} |
| NU700{size} | — | GEN-AB-H-{size} |
| NL400F{size} | — | GEN-AB-H-{size} (secondary) |
| NLP400F{size} | — | GEN-AB-H-{size} |
| NL500FB{size} | — | GEN-AB-B-{size} |
| NLP500FB{size} | — | GEN-AB-B-{size} / GEN-AB-B2-{size} |
| NE602B{size} | — | GEN-AB-P-{size} / GEN-AB-P2-{size} |

---

## Key Rules

1. **Split King = 2× TXL**: Any Split King (SK) SKU uses 2 Twin XL bases
2. **Bundle = Base + Mattress**: Bundle SKUs (e.g., SS-TXL-AB+MA+ESS+12") contain an adjustable base component + a mattress component
3. **14" mattress versioning**: 14" mattresses often have a "-2" suffix (SS14TXL-2) indicating the current version
4. **GEN v1 vs v2**: Classic and Bliss lines have v1 (GEN-AB-C-) and v2 (GEN-AB-C2-) bases; v2 is the current live component
5. **Alternate SKUs**: Many SKUs have a "-SS" suffix alternate for Shopify channel
