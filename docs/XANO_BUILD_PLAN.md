# Xano Build Plan — Marketing Intelligence Sandbox

> Workspace: **marketing sandbox** (`https://xria-ip7c-otef.n7e.xano.io`)
> API group used by the app: `api:0-tFJsMo` (data API)
> Last updated: 2026-04-13

This is the single source of truth for what needs to be built on the Xano side
to remove all remaining mock data from the marketing-intelligence app. It is
organized so each section is self-contained: a feature, the table DDL, the
function-stack pseudocode for every endpoint, the ingestion job, and the env
vars it depends on.

The frontend hooks (`src/api/hooks.js`) already expect the field names
documented here. As soon as a section's tables + endpoint exist, that part of
the UI lights up with no further frontend work — `fetchWithFallback` swaps
mock for live data automatically.

---

## 0. Existing tables (do NOT re-create)

Confirmed by live probe on 2026-04-13:

| Table                       | Notes                                                        |
| --------------------------- | ------------------------------------------------------------ |
| `marketplace_sku`           | 265 rows. The canonical SKU. All 17 fields validated.        |
| `sku_metrics_daily`         | Inferred — source of `metrics.actuals[]`. Daily granularity. |
| `sku_metrics_forecast`      | Inferred — source of `metrics.forecast`.                     |
| `promo`                     | Source of `/detail.upcoming_promos[]`. 10 fields.            |
| `spend_forecast_daily`      | 417 rows. Powers allocator + Home pacing widget.             |

**One bug to fix here**: the `/metrics` Xano function stack returns
`{actuals, forecast}`. The frontend now handles both `.actual` and `.actuals`
in `mapMetrics`, so this is no longer a hard dependency, but it would be
cleaner to align Xano's response key on the singular `actual`.

---

## 1. `category_fee` (Amazon referral fees + Shopify processing)

### Table

```
category_fee
  id                       int  PK
  category                 text          # e.g. "bedroom_furniture", "mattresses"
  channel                  enum(amazon, shopify, walmart, ebay, target)
  referral_tier1_rate      decimal(5,4)  # 0.0000-1.0000
  referral_tier1_cap       decimal(10,2) # dollar threshold for tier 2
  referral_tier2_rate      decimal(5,4)
  referral_min             decimal(10,2) # min referral $ per unit
  service_fee_pct          decimal(5,4)  # FBA / fulfillment fee %
  processing_pct           decimal(5,4)  # card processing (Shopify)
  processing_flat          decimal(10,2) # per-transaction flat fee
  effective_date           date
  created_at               timestamp     default now()
```

Index: `(category, channel, effective_date)`

### Endpoint

`GET /category_fees?category=X&channel=Y` →
function stack:
```
1. Query All Records FROM category_fee
   WHERE category = inputs.category AND channel = inputs.channel
   ORDER BY effective_date DESC
2. Return as response (frontend picks the most recent row)
```

### Seed data
See `docs/seed/category_fees.csv`. Source: [Amazon Seller Central referral fees](https://sellercentral.amazon.com/help/hub/reference/G200336920).

### No ingestion job
Reference data — manual updates ~1×/year when Amazon revises rates.

---

## 2. `spend_daily` (Home page — actuals across channels)

### Table

```
spend_daily
  id              int  PK
  date            date         indexed
  channel         enum(amazon, shopify, walmart, google, meta, microsoft, tiktok)
  subchannel      text         nullable      # SP/SB/SD, search/pmax, feed/reels
  revenue         decimal(12,2)
  ad_spend        decimal(12,2)
  units           int
  orders          int
  impressions     bigint
  clicks          bigint
  cvr             decimal(8,4)               # %
  acos            decimal(8,4)               # %
  roas            decimal(8,4)
  aov             decimal(12,2)
  source_run_id   uuid                       # ties to ingestion_run for audit
  created_at      timestamp default now()
```

Unique key: `(date, channel, subchannel)`

### Endpoint

`GET /spend_daily?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` →
```
1. Query All Records FROM spend_daily
   WHERE date >= inputs.start_date AND date <= inputs.end_date
   ORDER BY date ASC, channel ASC
2. Return as response
```

The frontend pivots in JS (see `useSpendDaily` in `src/api/hooks.js`), so no
need for a Xano-side pivot endpoint.

### Ingestion (5 background tasks, all run nightly at 04:00 UTC)

Each task is a separate Xano background task. All use Xano env vars; no
secrets in code.

#### `ingest_google_ads_spend`
- Env: `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`
- Pseudocode:
  ```
  1. POST https://oauth2.googleapis.com/token (refresh) → access_token
  2. POST https://googleads.googleapis.com/v17/customers/{cid}/googleAds:searchStream
     query: SELECT segments.date, campaign.advertising_channel_type,
                   metrics.cost_micros, metrics.impressions, metrics.clicks,
                   metrics.conversions, metrics.conversions_value
            FROM campaign WHERE segments.date DURING LAST_7_DAYS
  3. For each row: UPSERT spend_daily (date, channel='google', subchannel=advertising_channel_type)
       revenue = conversions_value, ad_spend = cost_micros / 1e6,
       orders = conversions, clicks, impressions
  ```

#### `ingest_meta_ads_spend`
- Env: `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`
- Pseudocode:
  ```
  1. GET https://graph.facebook.com/v19.0/act_{id}/insights
       ?level=campaign&time_increment=1
       &date_preset=last_7d
       &fields=spend,impressions,clicks,actions,action_values
       &access_token={token}
  2. For each row: UPSERT spend_daily (date, channel='meta',
                                       subchannel=optimization_goal)
       revenue = action_values.find(action_type='purchase').value,
       ad_spend = spend, orders = actions.find(action_type='purchase').value
  ```

#### `ingest_microsoft_ads_spend`
- Env: `MS_ADS_DEVELOPER_TOKEN`, `MS_ADS_CLIENT_ID`, `MS_ADS_CLIENT_SECRET`,
       `MS_ADS_REFRESH_TOKEN`, `MS_ADS_CUSTOMER_ID`, `MS_ADS_ACCOUNT_ID`
- Pseudocode:
  ```
  1. POST https://login.microsoftonline.com/common/oauth2/v2.0/token (refresh)
  2. POST Reporting Service v13: SubmitGenerateReport with CampaignPerformanceReportRequest
       Columns: TimePeriod, CampaignName, Spend, Impressions, Clicks,
                Conversions, Revenue
       TimePeriod: LastSevenDays
  3. Poll PollGenerateReport until ReportRequestStatus=Success → ReportDownloadUrl
  4. Download CSV. UPSERT spend_daily (channel='microsoft', subchannel=null)
  ```

#### `ingest_shopify_revenue`
- Env: `SHOPIFY_ADMIN_TOKEN`, `SHOPIFY_SHOP_DOMAIN`
- Pseudocode (Shopify has no "ad spend" — just revenue side):
  ```
  1. GET https://{shop}.myshopify.com/admin/api/2024-10/orders.json
       ?status=any&created_at_min={7 days ago}&fields=id,created_at,
        total_price,line_items,refunds
       header: X-Shopify-Access-Token: {token}
  2. Group by date(created_at). UPSERT spend_daily
       (date, channel='shopify', subchannel=null)
       revenue = SUM(total_price - refund_total),
       orders = COUNT(*), units = SUM(line_items.quantity)
  3. ad_spend stays 0 — Shopify itself doesn't drive paid traffic.
  ```

#### `ingest_northbeam_attribution` (FILLS THE AMAZON GAP)
- Env: `NORTHBEAM_API_KEY`, `NORTHBEAM_CLIENT_ID`
- Pseudocode:
  ```
  1. GET https://api.northbeam.io/v1/exports/breakdowns
       ?period_type=daily&period_options.period_starting_at={7 days ago}
       &period_options.period_ending_at={today}
       &breakdowns[]=platform
       &metrics[]=spend&metrics[]=attributed_rev
       &metrics[]=attributed_rev_first_click&metrics[]=attributed_rev_last_click
       &attribution_models[]=last_touch&attribution_models[]=mta
       header: Authorization: Basic {base64(client_id:api_key)}
  2. For each row: UPSERT spend_daily
       (date, channel=mapPlatform(platform), subchannel='nb_mta')
       revenue = attributed_rev, ad_spend = spend
     mapPlatform: facebook→meta, google→google, amazon→amazon, etc.
  3. Northbeam attribution is the ONLY way to track Amazon spend before
     the Amazon Ads API approval lands. Mark these rows with subchannel='nb_mta'
     so they can be replaced without losing audit trail.
  ```

### `ingestion_run` (audit table, optional but recommended)

```
ingestion_run
  id              uuid PK
  source          enum(google_ads, meta_ads, ms_ads, shopify, northbeam, sp_api, walmart_marketplace)
  started_at      timestamp
  finished_at     timestamp nullable
  status          enum(running, success, error)
  rows_upserted   int
  error_message   text nullable
```

---

## 3. `channel_campaign` (Channels Deep Dive)

### Table

```
channel_campaign
  id                int  PK
  campaign_id       text                   # platform-native id (e.g. amz-sp-001)
  channel           enum(...)
  campaign_name     text
  subchannel        text                   # SP/SB/SD, search/pmax, feed/reels
  status            enum(active, paused, ended)
  spend_30d         decimal(12,2)
  revenue_30d       decimal(12,2)
  impressions_30d   bigint
  clicks_30d        bigint
  cvr               decimal(8,4)
  acos              decimal(8,4)
  roas              decimal(8,4)
  start_date        date
  end_date          date nullable
  target_acos       decimal(8,4) nullable
  geo_targets       json nullable          # ["US-NY", "US-CA", ...]
  last_synced_at    timestamp default now()
```

Unique key: `(campaign_id, channel)`

### Endpoint

`GET /channel_campaigns?channel=X` →
```
1. Query All Records FROM channel_campaign
   WHERE channel = inputs.channel (or skip filter if blank)
   ORDER BY spend_30d DESC
2. Return as response
```

### Ingestion

Reuse the same nightly background tasks above. Each task additionally
aggregates by campaign over the trailing 30 days and UPSERTs into
`channel_campaign`. So one task does both `spend_daily` (daily) and
`channel_campaign` (30d rollup).

---

## 4. `inventory_snapshot` + `/detail.inventory` join

### Table

```
inventory_snapshot
  id                  int  PK
  marketplace_sku_id  int  FK → marketplace_sku.id
  dc                  text                    # e.g. "JAX", "AMZ-DTW1"
  on_hand             int
  in_transit          int
  allocated           int
  days_of_cover       int
  snapshot_date       date
  source              enum(sp_api, shopify_admin, walmart_mp, manual)
  created_at          timestamp default now()
```

Index: `(marketplace_sku_id, snapshot_date DESC)`

### Endpoint

`GET /inventory?marketplace_sku_id=X` →
```
1. Query All Records FROM inventory_snapshot WHERE marketplace_sku_id = X
2. Sort by snapshot_date DESC, take first
3. Return as response
```

Also: update the existing `/detail` function stack to LEFT JOIN
`inventory_snapshot` (most recent) and emit it as `detail.inventory`.

### Ingestion

#### `ingest_amazon_inventory` (when SP-API access lands; can do today if SP-API token already in env)
- Env: `SP_API_REFRESH_TOKEN`, `SP_API_CLIENT_ID`, `SP_API_CLIENT_SECRET`,
       `SP_API_AWS_ACCESS_KEY_ID`, `SP_API_AWS_SECRET_ACCESS_KEY`, `SP_API_ROLE_ARN`
- Pseudocode:
  ```
  1. AWS STS AssumeRole → temp credentials
  2. SP-API: GET /fba/inventory/v1/summaries?granularityType=Marketplace
       &granularityId=ATVPDKIKX0DER&details=true
  3. For each summary: UPSERT inventory_snapshot
       on_hand = totalQuantity, in_transit = inboundShippedQuantity,
       allocated = reservedQuantity (customerOrderQuantity)
  ```

#### `ingest_shopify_inventory`
- Env: `SHOPIFY_ADMIN_TOKEN`, `SHOPIFY_SHOP_DOMAIN`
- Pseudocode:
  ```
  1. GraphQL POST /admin/api/2024-10/graphql.json
     query { products(first:250) { edges { node { variants(first:50) {
       edges { node { sku, inventoryQuantity, inventoryItem {
         inventoryLevels(first:10) { edges { node {
           location { name }, available, incoming } } } } } } } } } } }
  2. Match variant.sku → marketplace_sku.external_id
  3. UPSERT inventory_snapshot (dc=location.name, on_hand=available,
                                in_transit=incoming)
  ```

---

## 5. `gen_sku` + `sku_component` (BOM)

### Tables

```
gen_sku
  id                  int  PK
  gen_sku             text  UNIQUE         # e.g. "GEN-AB-E-Q"
  name                text
  vendor              text
  lead_time_weeks     int
  landed_cost         decimal(10,2)
  on_hand             int
  avg_weekly_sales    decimal(10,2)
  days_of_cover       int
  lifecycle           enum(launch, mature, closeout)
  marketing_posture   enum(buffer, free_to_push, hold)
  balanced            bool
  primary_dc          text
  active_price_tests  int default 0
  share_of_velocity   decimal(8,4)
  created_at          timestamp default now()
  updated_at          timestamp

sku_component
  id                  int  PK
  marketplace_sku_id  int  FK → marketplace_sku.id
  gen_sku_id          int  FK → gen_sku.id
  qty                 int default 1
  share_of_velocity   decimal(5,4)        # this SKU's share of component velocity (0-1)
  created_at          timestamp default now()
```

Indexes: `sku_component(marketplace_sku_id)`, `sku_component(gen_sku_id)`,
`gen_sku(gen_sku)`.

### Endpoints

`GET /sku_components?marketplace_sku_id=X` →
```
1. Query sku_component WHERE marketplace_sku_id = X
2. Add-on: For each row, get gen_sku (by gen_sku_id), inline its fields
3. Compute sku_count = COUNT(sku_component WHERE gen_sku_id = same) for each
4. Return array
```

`GET /component_detail?component_id=X` →
```
1. Get gen_sku WHERE id = X
2. Add-on: list of marketplace_sku rows that share this component
3. Return { ...gen_sku, marketplace_skus_count, marketplace_skus[] }
```

Also: update `/detail` function stack to add a sub-array `components` =
the result of `GET /sku_components?marketplace_sku_id={input}`.

### Backfill (one-time, not nightly)

Source: the spreadsheet that was previously imported. Likely already in
Xano as a flat table — needs to be split into `gen_sku` + `sku_component`.
Manual one-time SQL or CSV import.

---

## 6. `price_history` + `/detail.price_history` join

### Table

```
price_history
  id                  int  PK
  marketplace_sku_id  int  FK
  price               decimal(10,2)
  start_date          date
  end_date            date nullable    # null = current
  days                int               # cached: end - start
  cvr                 decimal(8,4)      # window-aggregated
  impression_share    decimal(8,4)      # window-aggregated
  sessions            int
  velocity            decimal(8,4)
  spend               decimal(12,2)
  contrib             decimal(12,2)
  created_at          timestamp default now()
```

Index: `(marketplace_sku_id, start_date DESC)`

### Endpoint

Embedded in `/detail` as `detail.price_history.items[]` (sorted desc by
start_date). Also a standalone `GET /price_history?marketplace_sku_id=X`
for the price-history modal if needed.

### Backfill

Snapshot job: every Monday at 06:00 UTC, for each marketplace_sku, if
`buybox_price` differs from the most recent `price_history.price` (or no
row yet), close the previous row (set `end_date` = yesterday, `days` = end-start),
and insert a new row with current price + last 7 days of CVR/velocity/spend
from `sku_metrics_daily`.

---

## 7. `price_test_rec` (Recommendations)

### Table

```
price_test_rec
  id                   int  PK
  marketplace_sku_id   int  FK
  price_point          decimal(10,2)
  delta_pct            decimal(8,4)
  direction            enum(upward, downward)
  confidence           enum(high, medium, low)
  reasoning            text
  expected_impact_json json     # {cvr_delta, units_delta, contrib_delta, margin_delta}
  duration_days        int
  min_sample           int
  status               enum(pending, blocked, scheduled, approved, rejected)
  block_reason         text nullable
  scheduled_start      date nullable
  generated_at         timestamp default now()
  generator_version    text                    # e.g. "v1_trailing_trend"
```

### Endpoint
`GET /price_test_recs?marketplace_sku_id=X&status=Y` (optional filter)

### Generation
Background task `generate_price_test_recs` — runs daily, evaluates each
SKU against rule set (CVR-stable + above-target margin = upward
recommendation, CVR-falling + below-target margin = downward, etc.).
This is internal logic — no third-party API.

---

## 8. Reviews / VOC / Feedback Queue (DEFERRED — needs vendor decision)

These need either:
- A reviews vendor (Reviewbox, Bazaarvoice, Helium 10, Yotpo) for `/reviews`
- An NLP pass on top of reviews for `/voc_themes`
- Internal CRUD app for `/feedback_queue`

Tables proposed (build later):
- `review_rollup`, `review`, `voc_theme`, `feedback_queue`

See `SSM_Field_Mapping.xlsx` → Products_Detail tab → Reviews / VOC /
Feedback section for the full field list.

---

## 9. `competitor` (DEFERRED — needs Keepa or DataHawk subscription)

Schema:
```
competitor
  id                  int PK
  marketplace_sku_id  int FK
  asin                text
  title               text
  brand               text
  is_hero             bool
  bsr                 int
  bsr_trend           enum(up, down, flat)
  rating              decimal(2,1)
  reviews             int
  price               decimal(10,2)
  impression_share    decimal(8,4)
  click_share         decimal(8,4)
  cart_share          decimal(8,4)
  conversion_share    decimal(8,4)
  snapshot_date       date
```

Ingestion: Keepa API (https://keepa.com/#!api) or DataHawk depending on which is procured.

---

## 10. Frontend hooks already wired

These exist in `src/api/hooks.js` and will swap from mock → live the moment
the corresponding endpoint returns rows:

| Hook                       | Endpoint                                          | Status                  |
| -------------------------- | ------------------------------------------------- | ----------------------- |
| `useSkuOverview`           | `GET /overview`                                   | LIVE                    |
| `useSkuDetail`             | `GET /detail?marketplace_sku_id=X`                | LIVE (sub-objs missing) |
| `useSkuMetrics`            | `GET /metrics?marketplace_sku_id=X&period=Y`      | LIVE                    |
| `useSpendForecast`         | `GET /spend_forecast_daily`                       | LIVE                    |
| `useCategoryFees`          | `GET /category_fees?category=X&channel=Y`         | Pending (this doc §1)   |
| `useComponentDetail`       | `GET /component_detail?component_id=X`            | Pending (§5)            |
| `useSpendDaily`            | `GET /spend_daily?start_date=...&end_date=...`    | Pending (§2)            |
| `useChannelCampaigns`      | `GET /channel_campaigns?channel=X`                | Pending (§3)            |
| `useInventorySnapshot`     | `GET /inventory?marketplace_sku_id=X`             | Pending (§4)            |
| `useGenSkuComponents`      | `GET /sku_components?marketplace_sku_id=X`        | Pending (§5)            |
| `useRecommendationFeedback`| `POST /recommendation_feedback`                   | LIVE (write)            |
| `useCreatePriceTest`       | `POST /price_tests`                               | LIVE (write)            |

---

## 11. Build order (recommended)

1. **Quick wins, day 1**:
   - Create `category_fee` table + endpoint + import seed CSV (§1).
   - Add `/promos` endpoint (just a GET on existing `promo` table).
2. **Home + Channels backbone, week 1**:
   - Create `spend_daily` and `channel_campaign` tables (§2, §3).
   - Build the 5 ingestion tasks: Google, Meta, MS, Shopify, Northbeam.
   - Backfill 90 days from each.
3. **Detail page completeness, week 1-2**:
   - Create `inventory_snapshot` + `/inventory` endpoint + sync from Shopify Admin (§4).
   - Backfill `gen_sku` + `sku_component` from existing spreadsheet (§5).
   - Update `/detail` function stack to inline these as sub-objects.
4. **Snapshots, week 2**:
   - Create `price_history` table + Monday snapshot job (§6).
5. **Recommendations engine, week 3**:
   - Internal logic for `price_test_rec` generation (§7).
6. **Deferred** (separate procurement decisions):
   - `/competitors` (Keepa subscription) (§9).
   - `/reviews`, `/voc_themes`, `/feedback_queue` (§8).
