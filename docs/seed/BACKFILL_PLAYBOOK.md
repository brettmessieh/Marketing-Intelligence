# Historical Backfill Playbook (marketing-sandbox only)

These are copy-paste-ready Xano background-task snippets for backfilling
`spend_daily`, `channel_campaign`, and related tables from each channel
API as far back as each platform allows. **Run these in the
marketing-sandbox workspace only.**

The credentials referenced (`GOOGLE_ADS_*`, `META_*`, etc.) are already in
the workspace's environment variables — see
`docs/XANO_BUILD_PLAN.md` for the full list.

> All snippets assume the destination table schema documented in
> `docs/XANO_BUILD_PLAN.md`. Tables must exist before you run the task;
> create them via the Xano UI (or via a metadata-API task — requires PAT).

## Channel coverage windows

| Channel              | Historical depth available                       | Notes                                       |
|----------------------|--------------------------------------------------|---------------------------------------------|
| Google Ads           | ~3 years via `customer_client.query`             | Use `report_date` segments                  |
| Meta (Facebook) Ads  | 37 months hard cap                               | Insights API rate-limits — paginate slowly  |
| Microsoft Ads        | 3 years (`ReportingService`)                     | Async report pattern — poll for completion  |
| Shopify Admin        | All-time (subject to API version)                | Orders endpoint paginated by `created_at`   |
| Northbeam            | Account creation date (~24 months typical)       | `/exports` endpoint, day-grain              |
| Amazon SP-API ads    | 60 days for Sponsored Ads reports                | We rely on Northbeam for Amazon attribution |

## Operational guardrails

- **Sandbox only.** Every snippet writes to `marketing-sandbox`. Verify
  the workspace ID before kicking off (Settings → Workspace).
- **Idempotent inserts.** Each snippet upserts on `(date, channel,
  campaign_id)` so reruns don't double-count.
- **Throttle.** Pull one calendar month at a time and `sleep(2)` between
  pages — every channel rate-limits at burst > 5 req/s.
- **Audit log.** Insert one row into `ingest_log` per task run with
  `{channel, start_date, end_date, rows_written, status, error}`.

---

## 1. Google Ads → spend_daily, channel_campaign

Background task: `backfill_google_ads_daily(start_date, end_date)`.

```js
// Xano function stack — JavaScript flavor
// Inputs: start_date, end_date (YYYY-MM-DD strings)
const accessToken = await env.GOOGLE_ADS_OAUTH_REFRESH(); // helper that
                                                          // exchanges
                                                          // GOOGLE_ADS_REFRESH_TOKEN
                                                          // for an access token
const headers = {
  "Authorization": "Bearer " + accessToken,
  "developer-token": env.GOOGLE_ADS_DEVELOPER_TOKEN,
  "login-customer-id": env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  "Content-Type": "application/json",
};

const gaql = `
  SELECT
    segments.date,
    campaign.id,
    campaign.name,
    campaign.advertising_channel_type,
    metrics.cost_micros,
    metrics.impressions,
    metrics.clicks,
    metrics.conversions,
    metrics.conversions_value
  FROM campaign
  WHERE segments.date BETWEEN '${start_date}' AND '${end_date}'
`;

const res = await fetch(
  `https://googleads.googleapis.com/v17/customers/${env.GOOGLE_ADS_CUSTOMER_ID}/googleAds:searchStream`,
  { method: "POST", headers, body: JSON.stringify({ query: gaql }) }
);
const stream = await res.json();

for (const batch of stream) {
  for (const row of batch.results) {
    const date = row.segments.date;
    const cost = (row.metrics.costMicros || 0) / 1e6;

    // 1. Upsert per-day total into spend_daily
    await db.spend_daily.upsert(
      { date, channel: "google" },
      {
        ad_spend: cost,
        revenue: row.metrics.conversionsValue || 0,
        impressions: row.metrics.impressions || 0,
        clicks: row.metrics.clicks || 0,
        orders: row.metrics.conversions || 0,
        units: row.metrics.conversions || 0, // Google doesn't separate units
      }
    );

    // 2. Insert per-campaign row into channel_campaign
    await db.channel_campaign.upsert(
      { date, channel: "google", campaign_id: String(row.campaign.id) },
      {
        campaign_name: row.campaign.name,
        campaign_type: row.campaign.advertisingChannelType,
        spend: cost,
        revenue: row.metrics.conversionsValue || 0,
        impressions: row.metrics.impressions || 0,
        clicks: row.metrics.clicks || 0,
        conversions: row.metrics.conversions || 0,
      }
    );
  }
}
```

**Schedule:** kick off month-by-month via Xano scheduler. Three years =
36 monthly runs; expect ~5 minutes per run.

---

## 2. Meta Ads → spend_daily, channel_campaign

Background task: `backfill_meta_ads_daily(start_date, end_date)`.

```js
const token = env.META_ACCESS_TOKEN;
const accountId = env.META_AD_ACCOUNT_ID; // "act_XXXXXXXXX"

// Insights endpoint with day breakdown
const url = `https://graph.facebook.com/v20.0/${accountId}/insights` +
  `?level=campaign` +
  `&time_range={'since':'${start_date}','until':'${end_date}'}` +
  `&time_increment=1` +
  `&fields=campaign_id,campaign_name,spend,impressions,clicks,actions,action_values,reach` +
  `&limit=500` +
  `&access_token=${token}`;

let next = url;
while (next) {
  const res = await fetch(next).then(r => r.json());
  for (const row of res.data || []) {
    const purchases = (row.actions || []).find(a => a.action_type === "purchase")?.value || 0;
    const purchaseValue = (row.action_values || []).find(a => a.action_type === "purchase")?.value || 0;

    await db.spend_daily.upsert(
      { date: row.date_start, channel: "meta" },
      {
        ad_spend: Number(row.spend) || 0,
        revenue: Number(purchaseValue),
        impressions: Number(row.impressions) || 0,
        clicks: Number(row.clicks) || 0,
        orders: Number(purchases),
      }
    );

    await db.channel_campaign.upsert(
      { date: row.date_start, channel: "meta", campaign_id: row.campaign_id },
      {
        campaign_name: row.campaign_name,
        spend: Number(row.spend) || 0,
        revenue: Number(purchaseValue),
        impressions: Number(row.impressions) || 0,
        clicks: Number(row.clicks) || 0,
        conversions: Number(purchases),
        reach: Number(row.reach) || 0,
      }
    );
  }
  next = res.paging?.next || null;
  await sleep(2000); // Meta rate limit defense
}
```

**Schedule:** Meta caps at 37 months — start with `2023-03-13` →
`2026-04-13`. Run weekly chunks (52 weekly runs) to stay under
rate-limit windows.

---

## 3. Microsoft Ads → spend_daily, channel_campaign

Microsoft uses an async report pattern — request a report, poll for
completion, download the CSV.

```js
// Xano function stack — pseudocode
const headers = {
  "Authorization": "Bearer " + env.MS_ADS_ACCESS_TOKEN,
  "DeveloperToken": env.MS_ADS_DEVELOPER_TOKEN,
  "CustomerAccountId": env.MS_ADS_ACCOUNT_ID,
  "Content-Type": "application/json",
};

// 1. Submit report request
const submit = await fetch(
  "https://reporting.api.bingads.microsoft.com/Reporting/v13/CampaignPerformanceReport",
  {
    method: "POST",
    headers,
    body: JSON.stringify({
      ReportName: "BackfillCampaignPerf",
      Aggregation: "Daily",
      Time: { CustomDateRangeStart: parseDate(start_date),
              CustomDateRangeEnd: parseDate(end_date) },
      Columns: [
        "TimePeriod","CampaignId","CampaignName","Spend","Impressions",
        "Clicks","Conversions","Revenue"
      ],
      Format: "Csv",
    })
  }
).then(r => r.json());

// 2. Poll until ready
let url = null;
while (!url) {
  await sleep(15000);
  const status = await fetch(
    `https://reporting.api.bingads.microsoft.com/Reporting/v13/Reports/${submit.ReportRequestId}`,
    { headers }
  ).then(r => r.json());
  if (status.Status === "Success") url = status.ReportDownloadUrl;
  if (status.Status === "Error") throw new Error(status.ErrorMessage);
}

// 3. Download + parse CSV, upsert
const csv = await fetch(url).then(r => r.text());
const rows = parseCsv(csv);
for (const r of rows) {
  await db.spend_daily.upsert(
    { date: r.TimePeriod, channel: "microsoft" },
    { ad_spend: Number(r.Spend), revenue: Number(r.Revenue),
      impressions: Number(r.Impressions), clicks: Number(r.Clicks),
      orders: Number(r.Conversions) }
  );
  await db.channel_campaign.upsert(
    { date: r.TimePeriod, channel: "microsoft", campaign_id: r.CampaignId },
    { campaign_name: r.CampaignName, spend: Number(r.Spend),
      revenue: Number(r.Revenue), impressions: Number(r.Impressions),
      clicks: Number(r.Clicks), conversions: Number(r.Conversions) }
  );
}
```

**Schedule:** request a fresh report per quarter (12 quarters for 3
years). Each report download is a single bulk write.

---

## 4. Shopify Orders → spend_daily.revenue (Shopify side)

Shopify has no ad spend, but its orders feed `spend_daily.revenue`,
`orders`, and `units` for the Shopify channel. Pull from Admin GraphQL
ordering by `created_at`.

```js
const shop = env.SHOPIFY_SHOP_DOMAIN; // e.g. "sven-and-son.myshopify.com"
const token = env.SHOPIFY_ADMIN_TOKEN;

let cursor = null;
do {
  const query = `
    {
      orders(first: 250${cursor ? `, after: "${cursor}"` : ""},
             query: "created_at:>=${start_date} created_at:<=${end_date} financial_status:paid") {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            createdAt
            currentTotalPriceSet { shopMoney { amount } }
            lineItems(first: 50) { edges { node { quantity } } }
          }
        }
      }
    }`;
  const res = await fetch(
    `https://${shop}/admin/api/2026-01/graphql.json`,
    { method: "POST",
      headers: { "X-Shopify-Access-Token": token,
                 "Content-Type": "application/json" },
      body: JSON.stringify({ query }) }
  ).then(r => r.json());

  for (const edge of res.data.orders.edges) {
    const o = edge.node;
    const date = o.createdAt.slice(0, 10);
    const amt = Number(o.currentTotalPriceSet.shopMoney.amount);
    const units = o.lineItems.edges.reduce((s, e) => s + e.node.quantity, 0);

    // Increment-style upsert (sum across day)
    await db.spend_daily.upsertIncrement(
      { date, channel: "shopify" },
      { revenue: amt, orders: 1, units }
    );
  }
  cursor = res.data.orders.pageInfo.hasNextPage
    ? res.data.orders.pageInfo.endCursor : null;
} while (cursor);
```

---

## 5. Northbeam → spend_daily (full-funnel attribution)

Northbeam covers Amazon attribution that we can't get from SP-API yet.

```js
const url = "https://api.northbeam.io/v1/exports/" +
  env.NORTHBEAM_CLIENT_ID +
  `?metrics=spend,attributed_rev,visits,orders` +
  `&attribution_model=last_touch_3day` +
  `&period_type=daily` +
  `&period_options.period_starting_at=${start_date}` +
  `&period_options.period_ending_at=${end_date}` +
  `&breakdowns=platform`;

const data = await fetch(url, {
  headers: {
    "Authorization": "Basic " + btoa(env.NORTHBEAM_CLIENT_ID + ":" + env.NORTHBEAM_API_KEY),
    "Data-Client-ID": env.NORTHBEAM_DATA_CLIENT_ID,
  }
}).then(r => r.json());

for (const row of data.results) {
  // Northbeam platform names map to our channel enum
  const channelMap = { "Facebook Ads": "meta", "Google Ads": "google",
                       "Microsoft Ads": "microsoft",
                       "Amazon Ads": "amazon" };
  const channel = channelMap[row.breakdowns.platform];
  if (!channel) continue;

  await db.spend_daily.upsertNorthbeam(
    { date: row.date, channel },
    {
      nb_spend: Number(row.spend),
      nb_attributed_rev: Number(row.attributed_rev),
      nb_visits: Number(row.visits),
      nb_orders: Number(row.orders),
      nb_attribution_model: "last_touch_3day",
    }
  );
}
```

This populates the `nb_*` columns on `spend_daily` so the Home / Spend
Command Center can show first-party-vs-Northbeam side-by-side.

---

## Order of operations

1. **Tables first.** Create `spend_daily`, `channel_campaign`,
   `inventory_snapshot`, `category_fee` per the schemas in
   `docs/XANO_BUILD_PLAN.md`. Easiest path: copy each table's column
   list from that doc into the Xano UI's "Add table" wizard.
2. **Seed `category_fee`** from `docs/seed/category_fees.csv` (24 rows
   covering Amazon/Shopify/Walmart fee schedules). Use Xano's CSV
   import on the table.
3. **Run Shopify backfill first.** Cleanest data, no async patterns —
   confirms `spend_daily` plumbing works end-to-end.
4. **Then Google + Meta + Microsoft.** Run in parallel; they don't
   touch each other's rows.
5. **Then Northbeam.** Northbeam upserts onto rows the channel
   backfills already created — order matters so the `nb_*` columns
   land on existing rows rather than creating duplicates.
6. **Spot-check.** After each channel finishes, run
   `SELECT date, channel, ad_spend, revenue FROM spend_daily WHERE
   date >= NOW() - INTERVAL 7 DAY ORDER BY date DESC` and compare
   against each channel's native UI for the same week.

## When PAT lands

If/when you generate a Xano Personal Access Token scoped to
marketing-sandbox, hand it over and I can:

- Auto-create the four pending tables via the metadata API instead of
  the UI wizard.
- Import `category_fees.csv` programmatically.
- Spawn each backfill task above as a real Xano background task and
  monitor progress.
