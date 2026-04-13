# Meta Marketing API → Xano (marketing-sandbox)

A pragmatic-but-comprehensive ingestion plan. We capture every entity Meta
exposes plus daily insights at the ad grain (with the most useful breakdowns),
without committing to maintain the full ~1,000-field surface area. Anything we
don't promote to a typed column lands in a `raw_json` jsonb column on the same
row, so future queries can reach into deprecated/long-tail fields without a
schema migration.

---

## 0. Conventions

- **Workspace:** marketing-sandbox only. Never run any of these tasks against a
  production Xano instance.
- **API version:** pin to `v20.0` in every request. When Meta retires a version
  (every 12 months), bump in one place: a Xano environment variable
  `META_API_VERSION`.
- **Auth:** long-lived system-user token stored in env var `META_ACCESS_TOKEN`.
  Scopes: `ads_read`, `ads_management`, `business_management`,
  `read_insights`. Rotate quarterly.
- **Account targeting:** env var `META_AD_ACCOUNT_ID` (format `act_XXXXXXXX`).
  Multi-account support is a follow-on; everything below assumes single account.
- **Idempotent upserts:** every table has a unique constraint on its natural
  key. Inserts use `addOrEdit` (Xano) keyed on that constraint, so reruns are
  safe and replays are cheap.
- **Throttling:** Meta's user-level rate limit is `# calls in 1h <
  60 + 400 * # active ads`. Insights (especially with breakdowns) eats budget
  fast. Always sleep 1–2s between page fetches; use async reports for any pull
  larger than ~50k rows.
- **Cursor pagination:** every list endpoint returns `paging.next` (a full URL).
  Loop until it's null. Don't try to compute offsets manually — Meta's cursors
  are opaque.
- **Backfill window:** insights are capped at **37 months** of history. Pull the
  full 37 months once, then incremental from then on.

---

## 1. Entity tables

Five tables mirror Meta's object hierarchy. Each one keeps a curated set of
columns that the UI actually queries against, plus `raw_json` for everything
else. Pulls are nightly (entities barely change intraday) and are cheap.

### 1.1 `meta_account`

| col | type | notes |
|---|---|---|
| account_id | text | PK, e.g. `act_1234567890` |
| name | text | |
| account_status | int | 1=active, 2=disabled, 3=unsettled, … |
| currency | text | ISO-4217 |
| business_id | text | |
| business_name | text | |
| business_country_code | text | |
| timezone_id | int | |
| timezone_name | text | |
| timezone_offset_hours_utc | numeric | |
| amount_spent | numeric | lifetime, in account currency minor units |
| balance | numeric | |
| spend_cap | numeric | |
| funding_source | text | |
| min_campaign_group_spend_cap | numeric | |
| min_daily_budget | numeric | |
| capabilities | jsonb | array of capability strings |
| created_time | timestamp | |
| raw_json | jsonb | full response |
| ingested_at | timestamp | server clock |

**Unique key:** `(account_id)`

### 1.2 `meta_campaign`

| col | type | notes |
|---|---|---|
| campaign_id | text | PK |
| account_id | text | FK → meta_account |
| name | text | |
| objective | text | OUTCOME_SALES, OUTCOME_LEADS, … |
| status | text | ACTIVE / PAUSED / DELETED / ARCHIVED |
| effective_status | text | also reflects parent / billing issues |
| configured_status | text | what the user set |
| buying_type | text | AUCTION / RESERVED |
| bid_strategy | text | LOWEST_COST_WITHOUT_CAP, COST_CAP, … |
| daily_budget | numeric | minor units |
| lifetime_budget | numeric | minor units |
| budget_remaining | numeric | minor units |
| spend_cap | numeric | |
| special_ad_categories | jsonb | array — HOUSING, CREDIT, EMPLOYMENT, … |
| special_ad_category_country | jsonb | array |
| pacing_type | jsonb | array — standard, day_parting, … |
| smart_promotion_type | text | |
| source_campaign_id | text | if duplicated |
| start_time | timestamp | |
| stop_time | timestamp | |
| created_time | timestamp | |
| updated_time | timestamp | |
| last_budget_toggling_time | timestamp | |
| recommendations_count | int | |
| can_use_spend_cap | boolean | |
| can_create_brand_lift_study | boolean | |
| raw_json | jsonb | |
| ingested_at | timestamp | |

**Unique key:** `(campaign_id)`

### 1.3 `meta_adset`

| col | type | notes |
|---|---|---|
| adset_id | text | PK |
| account_id | text | FK |
| campaign_id | text | FK |
| name | text | |
| status | text | |
| effective_status | text | |
| configured_status | text | |
| billing_event | text | IMPRESSIONS, LINK_CLICKS, … |
| optimization_goal | text | OFFSITE_CONVERSIONS, REACH, … |
| bid_amount | numeric | minor units |
| bid_strategy | text | |
| daily_budget | numeric | |
| lifetime_budget | numeric | |
| daily_min_spend_target | numeric | |
| lifetime_min_spend_target | numeric | |
| daily_spend_cap | numeric | |
| lifetime_spend_cap | numeric | |
| destination_type | text | WEBSITE, APP, MESSENGER, … |
| pacing_type | jsonb | array |
| attribution_spec | jsonb | array of `{event_type, window_days}` |
| promoted_object | jsonb | pixel_id, custom_event_type, page_id, … |
| targeting | jsonb | full nested targeting spec — DO NOT normalize |
| targeting_optimization_types | jsonb | |
| frequency_control_specs | jsonb | array |
| learning_stage_info | jsonb | `{status, attribution_windows, exit…}` |
| start_time | timestamp | |
| end_time | timestamp | |
| created_time | timestamp | |
| updated_time | timestamp | |
| raw_json | jsonb | |
| ingested_at | timestamp | |

**Unique key:** `(adset_id)`

> Targeting is intentionally a single jsonb column. Meta exposes a
> ~150-field targeting spec with arbitrary nesting (countries, regions, zips,
> custom audiences, lookalikes, interests, behaviors, demographics, exclusion
> rules, flexible_spec…). Normalizing it would be a quarter of work and
> Meta still mutates the schema several times a year. Query it with
> `jsonb_path_query` when needed.

### 1.4 `meta_ad`

| col | type | notes |
|---|---|---|
| ad_id | text | PK |
| account_id | text | FK |
| campaign_id | text | FK |
| adset_id | text | FK |
| creative_id | text | FK → meta_creative |
| name | text | |
| status | text | |
| effective_status | text | |
| configured_status | text | |
| bid_amount | numeric | overrides adset if set |
| ad_review_feedback | jsonb | rejection reasons by channel |
| recommendations_count | int | |
| conversion_specs | jsonb | array |
| tracking_specs | jsonb | array — additional tracking pixels |
| preview_shareable_link | text | |
| source_ad_id | text | if duplicated |
| last_updated_by_app_id | text | |
| created_time | timestamp | |
| updated_time | timestamp | |
| raw_json | jsonb | |
| ingested_at | timestamp | |

**Unique key:** `(ad_id)`

### 1.5 `meta_creative`

| col | type | notes |
|---|---|---|
| creative_id | text | PK |
| account_id | text | FK |
| name | text | |
| status | text | |
| object_type | text | SHARE, VIDEO, PAGE_POST, … |
| object_story_id | text | page_post id |
| effective_object_story_id | text | |
| object_story_spec | jsonb | full creative spec — varies by subtype |
| asset_feed_spec | jsonb | dynamic creative spec |
| title | text | flat headline if applicable |
| body | text | flat body text if applicable |
| link_url | text | flat destination |
| image_url | text | |
| image_hash | text | |
| video_id | text | |
| thumbnail_url | text | |
| call_to_action_type | text | SHOP_NOW, LEARN_MORE, … |
| instagram_actor_id | text | |
| instagram_story_id | text | |
| url_tags | text | UTM string Meta appends |
| template_url | text | |
| raw_json | jsonb | |
| ingested_at | timestamp | |

**Unique key:** `(creative_id)`

> Creative is the messiest object — there are roughly a dozen subtypes
> (`link_data`, `video_data`, `photo_data`, `template_data`, carousels,
> collections, instant experiences, dynamic) each with a different shape.
> The flat columns above (title/body/link_url/image_url) are best-effort
> projections from `object_story_spec`; the full spec lives in jsonb.

---

## 2. Insights tables

Insights is a separate API. We capture three grains:

1. **Daily, no breakdowns** — one row per (ad_id, date, attribution_window).
   Cheap, comprehensive, the table the UI hits 95% of the time.
2. **Daily, with breakdown** — one row per (ad_id, date, breakdown_type,
   breakdown_value, attribution_window). Bigger. We pull the breakdowns we
   actually use: `placement`, `age_gender`, `region`, `device_platform`.
3. **Actions** — child table of #1, one row per (ad_id, date, attribution_window,
   action_type). Meta returns actions as a nested array; flattening into a child
   table is dramatically easier to query than `actions->>'$.purchase'` JSONB
   gymnastics.

### 2.1 `meta_insights_daily`

| col | type | notes |
|---|---|---|
| ad_id | text | FK |
| adset_id | text | FK |
| campaign_id | text | FK |
| account_id | text | FK |
| date | date | = `date_start` (daily grain) |
| attribution_window | text | `1d_click`, `7d_click`, `1d_view`, `7d_view`, `dda` |
| impressions | int | |
| reach | int | |
| frequency | numeric | |
| clicks | int | |
| unique_clicks | int | |
| inline_link_clicks | int | |
| inline_link_click_ctr | numeric | |
| outbound_clicks | int | (sum of outbound_clicks array) |
| spend | numeric | account currency, minor units |
| cpc | numeric | |
| cpm | numeric | |
| cpp | numeric | |
| ctr | numeric | |
| unique_ctr | numeric | |
| social_spend | numeric | |
| video_play_actions | int | |
| video_p25_watched_actions | int | |
| video_p50_watched_actions | int | |
| video_p75_watched_actions | int | |
| video_p95_watched_actions | int | |
| video_p100_watched_actions | int | |
| video_avg_time_watched_actions | numeric | seconds |
| video_thruplay_watched_actions | int | |
| estimated_ad_recallers | int | |
| estimated_ad_recall_rate | numeric | |
| quality_ranking | text | ABOVE_AVERAGE / AVERAGE / BELOW_AVERAGE_* |
| engagement_rate_ranking | text | |
| conversion_rate_ranking | text | |
| purchase_roas | numeric | (sum of purchase_roas array values) |
| website_purchase_roas | numeric | |
| cost_per_inline_link_click | numeric | |
| cost_per_unique_click | numeric | |
| cost_per_estimated_ad_recallers | numeric | |
| cost_per_thruplay | numeric | |
| canvas_avg_view_time | numeric | |
| canvas_avg_view_percent | numeric | |
| raw_json | jsonb | full insights row |
| ingested_at | timestamp | |

**Unique key:** `(ad_id, date, attribution_window)`

### 2.2 `meta_insights_actions`

Child table of `meta_insights_daily` — one row per (ad_id, date,
attribution_window, action_type). Meta returns this as the `actions` and
`action_values` arrays. We also explode the per-window subkeys.

| col | type | notes |
|---|---|---|
| ad_id | text | FK |
| date | date | |
| attribution_window | text | top-level requested window |
| action_type | text | `purchase`, `add_to_cart`, `lead`, `complete_registration`, `link_click`, `video_view`, `page_engagement`, `landing_page_view`, … |
| value | numeric | count |
| action_value | numeric | revenue if available |
| value_1d_click | numeric | per-window subcount |
| value_7d_click | numeric | |
| value_1d_view | numeric | |
| value_7d_view | numeric | |
| action_value_1d_click | numeric | per-window subvalue |
| action_value_7d_click | numeric | |
| action_value_1d_view | numeric | |
| action_value_7d_view | numeric | |
| ingested_at | timestamp | |

**Unique key:** `(ad_id, date, attribution_window, action_type)`

### 2.3 `meta_insights_breakdown_daily`

Same metric columns as `meta_insights_daily`, plus breakdown identifiers.
Breakdowns supported (each as its own row in the table — pick the breakdown set
per pull):

- `placement` (= publisher_platform + platform_position + device_platform combo)
- `age_gender` (age + gender pair)
- `region` (= country + region)
- `device_platform`

| col | type | notes |
|---|---|---|
| ad_id | text | FK |
| adset_id | text | |
| campaign_id | text | |
| account_id | text | |
| date | date | |
| attribution_window | text | |
| breakdown_type | text | `placement` / `age_gender` / `region` / `device_platform` |
| breakdown_value | text | composite — e.g. `instagram\|story\|mobile_app` for placement |
| breakdown_dim_1 | text | first sub-dim — e.g. publisher_platform |
| breakdown_dim_2 | text | second sub-dim — e.g. platform_position |
| breakdown_dim_3 | text | third sub-dim — e.g. device_platform |
| impressions | int | |
| reach | int | |
| frequency | numeric | |
| clicks | int | |
| spend | numeric | |
| cpc | numeric | |
| cpm | numeric | |
| ctr | numeric | |
| inline_link_clicks | int | |
| video_play_actions | int | |
| video_p100_watched_actions | int | |
| purchase_roas | numeric | |
| website_purchase_roas | numeric | |
| raw_json | jsonb | |
| ingested_at | timestamp | |

**Unique key:** `(ad_id, date, attribution_window, breakdown_type, breakdown_value)`

> Not every metric is breakdown-compatible (e.g. ranking metrics are
> ad-level only). We deliberately keep the breakdown table to a smaller
> metric set so queries stay snappy and the row counts stay manageable.

---

## 3. Background-task snippets (Xano)

All snippets are pseudocode for Xano background tasks. Replace `${env.X}` with
the Xano environment variable reference syntax.

### 3.1 Sync entities (nightly, 5 minutes after midnight UTC)

```js
// Task: meta_sync_entities
// Schedule: cron `5 0 * * *`
// Runtime: ~30s for a small account, ~5min for a large one

const VER  = `v${env.META_API_VERSION ?? "20.0"}`;
const ACCT = env.META_AD_ACCOUNT_ID;          // "act_1234567890"
const TOK  = env.META_ACCESS_TOKEN;
const BASE = `https://graph.facebook.com/${VER}`;

// ── helper: paginated GET that handles cursor + retry on 17/4/613 errors
async function getAll(url) {
  const out = [];
  let next = url;
  while (next) {
    const r = await api_request(next, { method: "GET" });
    if (r.status === 200) {
      out.push(...(r.body.data ?? []));
      next = r.body.paging?.next ?? null;
      await sleep(1000);                       // throttle
    } else if ([17, 4, 613].includes(r.body?.error?.code)) {
      await sleep(60_000);                      // rate-limit pause
    } else {
      throw new Error(`Meta GET failed: ${r.body?.error?.message}`);
    }
  }
  return out;
}

// ── 1. Account
const acctFields = [
  "id","name","account_status","currency","business","business_name",
  "business_country_code","timezone_id","timezone_name","timezone_offset_hours_utc",
  "amount_spent","balance","spend_cap","funding_source",
  "min_campaign_group_spend_cap","min_daily_budget","capabilities","created_time"
].join(",");
const acct = (await api_request(
  `${BASE}/${ACCT}?fields=${acctFields}&access_token=${TOK}`, { method: "GET" }
)).body;
await db_addOrEdit("meta_account", { account_id: acct.id }, {
  account_id: acct.id, name: acct.name, account_status: acct.account_status,
  currency: acct.currency, business_id: acct.business?.id,
  business_name: acct.business_name, business_country_code: acct.business_country_code,
  timezone_id: acct.timezone_id, timezone_name: acct.timezone_name,
  timezone_offset_hours_utc: acct.timezone_offset_hours_utc,
  amount_spent: acct.amount_spent, balance: acct.balance, spend_cap: acct.spend_cap,
  funding_source: acct.funding_source,
  min_campaign_group_spend_cap: acct.min_campaign_group_spend_cap,
  min_daily_budget: acct.min_daily_budget,
  capabilities: acct.capabilities, created_time: acct.created_time,
  raw_json: acct, ingested_at: now()
});

// ── 2. Campaigns
const campaignFields = [
  "id","account_id","name","objective","status","effective_status","configured_status",
  "buying_type","bid_strategy","daily_budget","lifetime_budget","budget_remaining",
  "spend_cap","special_ad_categories","special_ad_category_country","pacing_type",
  "smart_promotion_type","source_campaign_id","start_time","stop_time",
  "created_time","updated_time","last_budget_toggling_time","recommendations_count",
  "can_use_spend_cap","can_create_brand_lift_study"
].join(",");
const campaigns = await getAll(
  `${BASE}/${ACCT}/campaigns?fields=${campaignFields}&limit=100&access_token=${TOK}`
);
for (const c of campaigns) {
  await db_addOrEdit("meta_campaign", { campaign_id: c.id }, {
    campaign_id: c.id, account_id: ACCT, name: c.name, objective: c.objective,
    status: c.status, effective_status: c.effective_status,
    configured_status: c.configured_status, buying_type: c.buying_type,
    bid_strategy: c.bid_strategy, daily_budget: c.daily_budget,
    lifetime_budget: c.lifetime_budget, budget_remaining: c.budget_remaining,
    spend_cap: c.spend_cap, special_ad_categories: c.special_ad_categories,
    special_ad_category_country: c.special_ad_category_country,
    pacing_type: c.pacing_type, smart_promotion_type: c.smart_promotion_type,
    source_campaign_id: c.source_campaign_id, start_time: c.start_time,
    stop_time: c.stop_time, created_time: c.created_time,
    updated_time: c.updated_time,
    last_budget_toggling_time: c.last_budget_toggling_time,
    recommendations_count: c.recommendations_count,
    can_use_spend_cap: c.can_use_spend_cap,
    can_create_brand_lift_study: c.can_create_brand_lift_study,
    raw_json: c, ingested_at: now()
  });
}

// ── 3. AdSets
const adsetFields = [
  "id","account_id","campaign_id","name","status","effective_status",
  "configured_status","billing_event","optimization_goal","bid_amount","bid_strategy",
  "daily_budget","lifetime_budget","daily_min_spend_target","lifetime_min_spend_target",
  "daily_spend_cap","lifetime_spend_cap","destination_type","pacing_type",
  "attribution_spec","promoted_object","targeting","targeting_optimization_types",
  "frequency_control_specs","learning_stage_info","start_time","end_time",
  "created_time","updated_time"
].join(",");
const adsets = await getAll(
  `${BASE}/${ACCT}/adsets?fields=${adsetFields}&limit=100&access_token=${TOK}`
);
for (const a of adsets) {
  await db_addOrEdit("meta_adset", { adset_id: a.id }, {
    adset_id: a.id, account_id: ACCT, campaign_id: a.campaign_id,
    name: a.name, status: a.status, effective_status: a.effective_status,
    configured_status: a.configured_status, billing_event: a.billing_event,
    optimization_goal: a.optimization_goal, bid_amount: a.bid_amount,
    bid_strategy: a.bid_strategy, daily_budget: a.daily_budget,
    lifetime_budget: a.lifetime_budget,
    daily_min_spend_target: a.daily_min_spend_target,
    lifetime_min_spend_target: a.lifetime_min_spend_target,
    daily_spend_cap: a.daily_spend_cap,
    lifetime_spend_cap: a.lifetime_spend_cap,
    destination_type: a.destination_type, pacing_type: a.pacing_type,
    attribution_spec: a.attribution_spec, promoted_object: a.promoted_object,
    targeting: a.targeting,
    targeting_optimization_types: a.targeting_optimization_types,
    frequency_control_specs: a.frequency_control_specs,
    learning_stage_info: a.learning_stage_info,
    start_time: a.start_time, end_time: a.end_time,
    created_time: a.created_time, updated_time: a.updated_time,
    raw_json: a, ingested_at: now()
  });
}

// ── 4. Ads
const adFields = [
  "id","account_id","campaign_id","adset_id","creative","name","status",
  "effective_status","configured_status","bid_amount","ad_review_feedback",
  "recommendations_count","conversion_specs","tracking_specs",
  "preview_shareable_link","source_ad_id","last_updated_by_app_id",
  "created_time","updated_time"
].join(",");
const ads = await getAll(
  `${BASE}/${ACCT}/ads?fields=${adFields}&limit=100&access_token=${TOK}`
);
for (const ad of ads) {
  await db_addOrEdit("meta_ad", { ad_id: ad.id }, {
    ad_id: ad.id, account_id: ACCT, campaign_id: ad.campaign_id,
    adset_id: ad.adset_id, creative_id: ad.creative?.id, name: ad.name,
    status: ad.status, effective_status: ad.effective_status,
    configured_status: ad.configured_status, bid_amount: ad.bid_amount,
    ad_review_feedback: ad.ad_review_feedback,
    recommendations_count: ad.recommendations_count,
    conversion_specs: ad.conversion_specs, tracking_specs: ad.tracking_specs,
    preview_shareable_link: ad.preview_shareable_link,
    source_ad_id: ad.source_ad_id,
    last_updated_by_app_id: ad.last_updated_by_app_id,
    created_time: ad.created_time, updated_time: ad.updated_time,
    raw_json: ad, ingested_at: now()
  });
}

// ── 5. Creatives (pulled via the ad → creative IDs to avoid the giant
//    /adcreatives list which can be 10s of thousands of rows)
const creativeFields = [
  "id","account_id","name","status","object_type","object_story_id",
  "effective_object_story_id","object_story_spec","asset_feed_spec",
  "title","body","link_url","image_url","image_hash","video_id","thumbnail_url",
  "call_to_action_type","instagram_actor_id","instagram_story_id","url_tags",
  "template_url"
].join(",");
const creativeIds = [...new Set(ads.map(ad => ad.creative?.id).filter(Boolean))];
for (const cid of creativeIds) {
  const c = (await api_request(
    `${BASE}/${cid}?fields=${creativeFields}&access_token=${TOK}`, { method: "GET" }
  )).body;
  await db_addOrEdit("meta_creative", { creative_id: c.id }, {
    creative_id: c.id, account_id: ACCT, name: c.name, status: c.status,
    object_type: c.object_type, object_story_id: c.object_story_id,
    effective_object_story_id: c.effective_object_story_id,
    object_story_spec: c.object_story_spec,
    asset_feed_spec: c.asset_feed_spec, title: c.title, body: c.body,
    link_url: c.link_url, image_url: c.image_url, image_hash: c.image_hash,
    video_id: c.video_id, thumbnail_url: c.thumbnail_url,
    call_to_action_type: c.call_to_action_type,
    instagram_actor_id: c.instagram_actor_id,
    instagram_story_id: c.instagram_story_id,
    url_tags: c.url_tags, template_url: c.template_url,
    raw_json: c, ingested_at: now()
  });
  await sleep(200);
}

await audit_log("meta_sync_entities", {
  campaigns: campaigns.length, adsets: adsets.length,
  ads: ads.length, creatives: creativeIds.length
});
```

### 3.2 Sync insights — incremental (hourly)

Pulls the last 3 days at the ad/day grain across all four attribution windows.
Three days because Meta back-dates conversions for up to 28 days, but the bulk
of revisions hit in the first 72h. Once a week, run `meta_sync_insights_revisions`
to refresh the trailing 28-day window.

```js
// Task: meta_sync_insights_recent
// Schedule: cron `15 * * * *`  (top of every hour at :15)

const VER  = `v${env.META_API_VERSION ?? "20.0"}`;
const ACCT = env.META_AD_ACCOUNT_ID;
const TOK  = env.META_ACCESS_TOKEN;
const BASE = `https://graph.facebook.com/${VER}`;

const fields = [
  "ad_id","adset_id","campaign_id","account_id","date_start","date_stop",
  "impressions","reach","frequency","clicks","unique_clicks",
  "inline_link_clicks","inline_link_click_ctr","outbound_clicks",
  "spend","cpc","cpm","cpp","ctr","unique_ctr","social_spend",
  "video_play_actions","video_p25_watched_actions","video_p50_watched_actions",
  "video_p75_watched_actions","video_p95_watched_actions","video_p100_watched_actions",
  "video_avg_time_watched_actions","video_thruplay_watched_actions",
  "estimated_ad_recallers","estimated_ad_recall_rate",
  "quality_ranking","engagement_rate_ranking","conversion_rate_ranking",
  "purchase_roas","website_purchase_roas",
  "cost_per_inline_link_click","cost_per_unique_click",
  "cost_per_estimated_ad_recallers","cost_per_thruplay",
  "canvas_avg_view_time","canvas_avg_view_percent",
  "actions","action_values"
].join(",");

const ATTR = ["1d_click","7d_click","1d_view","7d_view"];      // pull all four

const today = new Date();
const since = new Date(today); since.setUTCDate(today.getUTCDate() - 3);
const until = today;

for (const win of ATTR) {
  const url =
    `${BASE}/${ACCT}/insights` +
    `?fields=${fields}` +
    `&level=ad` +
    `&time_increment=1` +
    `&action_attribution_windows=["${win}"]` +
    `&use_account_attribution_setting=false` +
    `&time_range={"since":"${fmt(since)}","until":"${fmt(until)}"}` +
    `&limit=500&access_token=${TOK}`;

  let next = url;
  while (next) {
    const r = await api_request(next, { method: "GET" });
    if (r.status !== 200) {
      if ([17, 4, 613].includes(r.body?.error?.code)) { await sleep(60_000); continue; }
      throw new Error(r.body?.error?.message);
    }
    for (const row of r.body.data) {
      // 1) parent insights row
      await db_addOrEdit(
        "meta_insights_daily",
        { ad_id: row.ad_id, date: row.date_start, attribution_window: win },
        {
          ad_id: row.ad_id, adset_id: row.adset_id, campaign_id: row.campaign_id,
          account_id: row.account_id, date: row.date_start,
          attribution_window: win,
          impressions: row.impressions|0, reach: row.reach|0,
          frequency: +row.frequency || 0, clicks: row.clicks|0,
          unique_clicks: row.unique_clicks|0,
          inline_link_clicks: row.inline_link_clicks|0,
          inline_link_click_ctr: +row.inline_link_click_ctr || 0,
          outbound_clicks: sumActionArray(row.outbound_clicks),
          spend: +row.spend || 0,
          cpc: +row.cpc || 0, cpm: +row.cpm || 0, cpp: +row.cpp || 0,
          ctr: +row.ctr || 0, unique_ctr: +row.unique_ctr || 0,
          social_spend: +row.social_spend || 0,
          video_play_actions: sumActionArray(row.video_play_actions),
          video_p25_watched_actions: sumActionArray(row.video_p25_watched_actions),
          video_p50_watched_actions: sumActionArray(row.video_p50_watched_actions),
          video_p75_watched_actions: sumActionArray(row.video_p75_watched_actions),
          video_p95_watched_actions: sumActionArray(row.video_p95_watched_actions),
          video_p100_watched_actions: sumActionArray(row.video_p100_watched_actions),
          video_avg_time_watched_actions: sumActionArray(row.video_avg_time_watched_actions),
          video_thruplay_watched_actions: sumActionArray(row.video_thruplay_watched_actions),
          estimated_ad_recallers: row.estimated_ad_recallers|0,
          estimated_ad_recall_rate: +row.estimated_ad_recall_rate || 0,
          quality_ranking: row.quality_ranking,
          engagement_rate_ranking: row.engagement_rate_ranking,
          conversion_rate_ranking: row.conversion_rate_ranking,
          purchase_roas: sumRoas(row.purchase_roas),
          website_purchase_roas: sumRoas(row.website_purchase_roas),
          cost_per_inline_link_click: +row.cost_per_inline_link_click || 0,
          cost_per_unique_click: +row.cost_per_unique_click || 0,
          cost_per_estimated_ad_recallers: +row.cost_per_estimated_ad_recallers || 0,
          cost_per_thruplay: +row.cost_per_thruplay || 0,
          canvas_avg_view_time: +row.canvas_avg_view_time || 0,
          canvas_avg_view_percent: +row.canvas_avg_view_percent || 0,
          raw_json: row, ingested_at: now()
        }
      );

      // 2) child action rows (exploded)
      const actionMap = new Map();
      for (const a of row.actions ?? []) {
        actionMap.set(a.action_type, {
          ad_id: row.ad_id, date: row.date_start, attribution_window: win,
          action_type: a.action_type,
          value: +a.value || 0,
          value_1d_click: +a["1d_click"] || 0,
          value_7d_click: +a["7d_click"] || 0,
          value_1d_view:  +a["1d_view"]  || 0,
          value_7d_view:  +a["7d_view"]  || 0,
          ingested_at: now()
        });
      }
      for (const a of row.action_values ?? []) {
        const r2 = actionMap.get(a.action_type) ?? {
          ad_id: row.ad_id, date: row.date_start, attribution_window: win,
          action_type: a.action_type, value: 0, ingested_at: now()
        };
        r2.action_value = +a.value || 0;
        r2.action_value_1d_click = +a["1d_click"] || 0;
        r2.action_value_7d_click = +a["7d_click"] || 0;
        r2.action_value_1d_view  = +a["1d_view"]  || 0;
        r2.action_value_7d_view  = +a["7d_view"]  || 0;
        actionMap.set(a.action_type, r2);
      }
      for (const [, rec] of actionMap) {
        await db_addOrEdit("meta_insights_actions",
          { ad_id: rec.ad_id, date: rec.date, attribution_window: win,
            action_type: rec.action_type },
          rec);
      }
    }
    next = r.body.paging?.next ?? null;
    await sleep(1500);
  }
}

await audit_log("meta_sync_insights_recent", { ok: true });

function fmt(d) { return d.toISOString().slice(0,10); }
function sumActionArray(arr) {
  return Array.isArray(arr) ? arr.reduce((s,x) => s + (+x.value || 0), 0) : 0;
}
function sumRoas(arr) {
  // purchase_roas comes back as array of {action_type, value}; weight is implicit
  return Array.isArray(arr) ? arr.reduce((s,x) => s + (+x.value || 0), 0) : 0;
}
```

### 3.3 Sync insights — historical backfill (one-shot, async)

For the initial 37-month load, do NOT use the synchronous `/insights` endpoint —
it'll time out, hit user-rate limits, and rerun forever. Use the **async report**
flow: `POST /insights` to enqueue, poll `/{report_run_id}`, then download.

```js
// Task: meta_backfill_insights
// Run on demand (NOT scheduled). Use once per attribution_window.
// Param: attribution_window (e.g. "7d_click")
// Param: months_back (1..37) — start small, work up
// Runtime: minutes to hours depending on volume

const VER  = `v${env.META_API_VERSION ?? "20.0"}`;
const ACCT = env.META_AD_ACCOUNT_ID;
const TOK  = env.META_ACCESS_TOKEN;
const BASE = `https://graph.facebook.com/${VER}`;
const WIN  = input.attribution_window;          // task input
const N    = Math.min(input.months_back, 37);

const until = new Date();
const since = new Date(until); since.setUTCMonth(until.getUTCMonth() - N);

const fields = /* same as 3.2 */;

// 1) Enqueue async report
const enq = await api_request(`${BASE}/${ACCT}/insights`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    fields, level: "ad", time_increment: "1",
    action_attribution_windows: `["${WIN}"]`,
    use_account_attribution_setting: "false",
    time_range: JSON.stringify({ since: fmt(since), until: fmt(until) }),
    access_token: TOK
  }).toString()
});
const reportRunId = enq.body.report_run_id;
if (!reportRunId) throw new Error("enqueue failed: " + JSON.stringify(enq.body));

// 2) Poll until job completes (Meta usually finishes in 1–10 min)
let done = false;
while (!done) {
  await sleep(15_000);
  const status = await api_request(
    `${BASE}/${reportRunId}?access_token=${TOK}`, { method: "GET" }
  );
  const s = status.body.async_status;
  if (s === "Job Completed")        done = true;
  else if (s === "Job Failed")      throw new Error("report job failed");
  else if (s === "Job Skipped")     throw new Error("report job skipped");
  // else still running — keep polling
}

// 3) Stream paginated results into the same tables as 3.2
let next = `${BASE}/${reportRunId}/insights?limit=500&access_token=${TOK}`;
while (next) {
  const r = await api_request(next, { method: "GET" });
  if (r.status !== 200) {
    if ([17, 4, 613].includes(r.body?.error?.code)) { await sleep(60_000); continue; }
    throw new Error(r.body?.error?.message);
  }
  for (const row of r.body.data) {
    /* identical to the per-row write in 3.2 — extract as a shared
       db_function `meta_write_insights_row(row, win)` and call it from
       both tasks */
    await meta_write_insights_row(row, WIN);
  }
  next = r.body.paging?.next ?? null;
  await sleep(1000);
}

await audit_log("meta_backfill_insights", {
  attribution_window: WIN, months_back: N, report_run_id: reportRunId
});
```

> **Run order for backfill:** kick off `1d_click` first (smallest, validates
> the pipeline), then `7d_click`, then `1d_view`, then `7d_view`. Don't run
> them in parallel — Meta charges async-report jobs against the same rate
> budget as sync calls.

### 3.4 Sync insights — breakdowns (incremental)

Same shape as 3.2, but adds the `breakdowns` parameter and writes to
`meta_insights_breakdown_daily` instead. Run once per breakdown_type so each
job is independent and easy to retry.

```js
// Task: meta_sync_insights_breakdown
// Schedule: cron `30 */4 * * *`  (every 4h, offset to avoid the entity sync)
// Param: breakdown_type ("placement" | "age_gender" | "region" | "device_platform")

const breakdownMap = {
  placement:        "publisher_platform,platform_position,device_platform",
  age_gender:       "age,gender",
  region:           "country,region",
  device_platform:  "device_platform"
};
const BD = breakdownMap[input.breakdown_type];
if (!BD) throw new Error("unknown breakdown_type");

const fields = [
  "ad_id","adset_id","campaign_id","account_id","date_start",
  "impressions","reach","frequency","clicks","spend","cpc","cpm","ctr",
  "inline_link_clicks","video_play_actions","video_p100_watched_actions",
  "purchase_roas","website_purchase_roas"
].join(",");

const today = new Date();
const since = new Date(today); since.setUTCDate(today.getUTCDate() - 3);

for (const win of ["1d_click","7d_click"]) {  // breakdowns: 2 windows is plenty
  let next =
    `${BASE}/${ACCT}/insights` +
    `?fields=${fields}` +
    `&level=ad&time_increment=1` +
    `&breakdowns=${BD}` +
    `&action_attribution_windows=["${win}"]` +
    `&time_range={"since":"${fmt(since)}","until":"${fmt(today)}"}` +
    `&limit=500&access_token=${TOK}`;

  while (next) {
    const r = await api_request(next, { method: "GET" });
    if (r.status !== 200) { /* same retry logic */ }
    for (const row of r.body.data) {
      const dims = BD.split(",").map(d => row[d] ?? "");
      const value = dims.join("|");
      await db_addOrEdit("meta_insights_breakdown_daily",
        { ad_id: row.ad_id, date: row.date_start, attribution_window: win,
          breakdown_type: input.breakdown_type, breakdown_value: value },
        {
          ad_id: row.ad_id, adset_id: row.adset_id, campaign_id: row.campaign_id,
          account_id: row.account_id, date: row.date_start,
          attribution_window: win,
          breakdown_type: input.breakdown_type, breakdown_value: value,
          breakdown_dim_1: dims[0] ?? null,
          breakdown_dim_2: dims[1] ?? null,
          breakdown_dim_3: dims[2] ?? null,
          impressions: row.impressions|0, reach: row.reach|0,
          frequency: +row.frequency || 0, clicks: row.clicks|0,
          spend: +row.spend || 0, cpc: +row.cpc || 0, cpm: +row.cpm || 0,
          ctr: +row.ctr || 0,
          inline_link_clicks: row.inline_link_clicks|0,
          video_play_actions: sumActionArray(row.video_play_actions),
          video_p100_watched_actions: sumActionArray(row.video_p100_watched_actions),
          purchase_roas: sumRoas(row.purchase_roas),
          website_purchase_roas: sumRoas(row.website_purchase_roas),
          raw_json: row, ingested_at: now()
        });
    }
    next = r.body.paging?.next ?? null;
    await sleep(1500);
  }
}
```

---

## 4. Order of operations

1. **Provision tables** (manual in Xano): all eight from §1 + §2, with the
   unique constraints called out. Add indexes on (account_id, date) for
   `meta_insights_daily` and `meta_insights_breakdown_daily`.
2. **Set env vars:** `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`,
   `META_API_VERSION`.
3. **Run `meta_sync_entities` once manually.** Verify rows land in
   `meta_account` / `meta_campaign` / `meta_adset` / `meta_ad` /
   `meta_creative`. This is the safety check — if entity sync works, you
   have valid credentials and reasonable account scope.
4. **Run `meta_backfill_insights` for `1d_click`, `months_back: 1`.** Smallest
   possible test pull. Verify rows land in `meta_insights_daily` and
   `meta_insights_actions`. Spot-check totals against Ads Manager.
5. **Backfill the rest:** `1d_click` 37mo, then `7d_click` 37mo, then
   `1d_view` 37mo, then `7d_view` 37mo. One at a time. Each takes 30min–6h.
6. **Backfill breakdowns** (only if needed): run
   `meta_sync_insights_breakdown` once per breakdown_type with `months_back`
   bumped up via task input. Plan for 2–4× the row count of `meta_insights_daily`.
7. **Schedule the recurring tasks:** entities nightly, insights hourly,
   breakdowns every 4h.
8. **Wire `useChannelCampaigns("meta", ...)`** (frontend) to read from
   `meta_insights_daily` joined with `meta_campaign` / `meta_adset` / `meta_ad`.

---

## 5. Operational guardrails

- **Audit log:** every task writes a row to `audit_log` with task name,
  parameters, row counts, runtime, and any error. Wire a Slack webhook on
  failure rows.
- **Idempotency:** addOrEdit on the unique key. Reruns are safe. If a row
  already exists, `ingested_at` updates and `raw_json` is overwritten with
  the latest payload, but the natural key stays stable so downstream joins
  don't break.
- **Token rotation:** wrap `META_ACCESS_TOKEN` in a Xano function so when
  Meta forces a rotation (every ~60 days for system-user tokens) you only
  edit one place.
- **Rate-limit pause:** 60s sleep on error codes 17 (user-level rate),
  4 (app-level rate), 613 (custom rate). For repeated failures, fall back
  to async-report flow — Meta is much more lenient with async jobs.
- **Schema drift:** Meta deprecates ~10 fields per quarter and adds ~5.
  The `raw_json` column means a deprecation never breaks reads. When a
  field disappears, the typed column starts coming back null; decide then
  whether to drop it or backfill an expression off `raw_json`.
- **Sandbox containment:** all tasks check
  `if (env.XANO_WORKSPACE !== "marketing-sandbox") throw` at the top.
  Belt-and-braces against pointing at production by accident.
- **Cost ceiling:** at the (ad_id, date, 4 windows) grain you're looking at
  ~120 rows per ad per month. With a few thousand ads and 37mo backfill,
  that's low millions of rows in `meta_insights_daily` — well within
  Xano sandbox limits. Breakdowns multiply by 5–50×; if you turn on
  `placement` × `age_gender` you can hit 100M+ rows fast. Pick breakdowns
  deliberately.

---

## 6. What we deliberately did NOT capture

- **Targeting search catalog** (interests, behaviors, geo). Refresh on demand
  via `/search?type=adinterest`; not worth storing.
- **Reach / Delivery estimates.** Query-time only.
- **Pixel / Conversion API event detail.** Inbound to Meta from the site, not
  outbound; we only get aggregated insights.
- **Lead Ads form submissions.** Separate ingestion path — has PII handling
  and retention rules. Build only when needed.
- **Comments / reactions / page posts.** Different Graph API surface; not
  Marketing API.
- **Video assets.** Stored in `meta_creative.video_id`; full asset metadata
  (encodings, captions, custom labels) lives in `/{video-id}` and is rarely
  queried. Pull on demand.

If any of those become real requirements, each is a 1–3 day add-on with the
same `raw_json` discipline.
