![1774106279696](image/presales_dashboard_redesign_plan/1774106279696.png)# Pre-Sales Funnel Dashboard — Complete Redesign Implementation Plan (v2)

> **Updated:** 21 March 2026  
> **New additions in v2:** 12-color system, 6 user-customizable colors, Color Legend sub-tab, 15+ filters, default sort by closing date

---

## 1. What's Being Built (Plain English)

A **visual, color-coded funnel dashboard** for the Pre-Sales section that:

1. Shows every tender in a color-tinted table sorted by submission/closing date (nearest first by default)
2. Has **12 funnel colors** — 6 system-fixed (lifecycle meanings) + 6 user-customizable (assignable to any meaning)
3. Has a **Color Legend & Customization Sub-Tab** where users can see what each color means and re-assign the 6 user-defined colors
4. Has **15+ advanced filters** — by date range, status, color, client, assignee, value, EMD, submission state, corrigendum, and more
5. Has the full Bid lifecycle (create bid → submit → evaluation → won/lost → LOI → project)
6. Auto-sorts by closing date ascending (most urgent first)

---

## 2. Complete 12-Color System

### 2.1 System-Fixed Colors (6) — Meaning Cannot Change

These 6 colors are **hardcoded to lifecycle state**. The user cannot change their meaning.

| # | Color | Slot Name | Fixed Meaning | Entry Trigger |
|---|-------|-----------|---------------|---------------|
| 1 | 🔵 **Blue** | `SYSTEM_GONOGO` | GO/NO-GO Evaluation | New tender created |
| 2 | 🟡 **Yellow** | `SYSTEM_TECHNICAL` | Technical Cleared (GO done, EMD pending) | GO decision made |
| 3 | 🔴 **Red** | `SYSTEM_NOT_QUALIFIED` | Not Qualified (Technical rejected) | GO + tech rejected |
| 4 | 🟢 **Green** | `SYSTEM_BID_READY` | Bid Ready (Tech + EMD confirmed) | Tech approved + EMD done |
| 5 | 🟠 **Orange** | `SYSTEM_LOCKED` | Locked (Bid submitted, awaiting result) | Bid submitted |
| 6 | 🩷 **Pink** | `SYSTEM_OBSERVATION` | Under Observation (NO-GO/dropped/denied) | NO-GO / drop / denial |

### 2.2 User-Customizable Colors (6) — Label & Meaning Set By User

These 6 slots exist but have **no fixed meaning by default.** The user can assign any label/meaning to them through the Color Legend sub-tab. When they assign a color to a tender, that tender shows with the user's chosen color.

| # | Default Color | Slot Name | Default Label | Example User Usage |
|---|---------------|-----------|---------------|--------------------|
| 7 | 🟣 **Purple** | `USER_SLOT_1` | "Custom 1" | "Awaiting Client Docs" |
| 8 | 🩵 **Teal** | `USER_SLOT_2` | "Custom 2" | "Under Legal Review" |
| 9 | 🟤 **Brown** | `USER_SLOT_3` | "Custom 3" | "High Priority" |
| 10 | ⬛ **Dark Gray** | `USER_SLOT_4` | "Custom 4" | "On Hold — Finance Dept" |
| 11 | 🫐 **Indigo** | `USER_SLOT_5` | "Custom 5" | "Director Review Pending" |
| 12 | 🟫 **Maroon** | `USER_SLOT_6` | "Custom 6" | "Partner Tender" |

**How User Customization Works:**
- User goes to **Color Legend sub-tab**
- Picks one of the 6 user slots
- Optionally changes the **display color** (from a palette of ~20 safe CSS colors)
- Sets a **label** (e.g. "Awaiting Client Docs") and optional **description**
- Saves → all tenders tagged with that slot now display in the chosen color + label
- The change is **persisted in `GE Presales Color Config`** (a single settings DocType)

---

## 3. Funnel Flow (Updated — 12 Colors)

```
New Tender
    │
    ▼
🔵 [BLUE] GO/NO-GO Decision
    │
    ├── NO-GO ─────────────────────────────────────► 🩷 [PINK] Under Observation
    │
    ▼ GO
🟡 [YELLOW] Technical Review
    │
    ├── Technical Rejected ─────────────────────────► 🔴 [RED] Not Qualified
    │                                                        │
    │                                                        └─► Eventually ──► 🩷 PINK
    │
    ▼ Technical Approved
    │ (EMD still pending)
    │                     ← EMD Done + Confirmed ──────────► 🟢 [GREEN] Bid Ready
    │                                                               │
    │                                                    Presales denies bid ──► 🩷 [PINK]
    │                                                               │
    ▼ Bid Created & Submitted ◄─────────────────────────────────────┘
🟠 [ORANGE] Locked — Awaiting Result
    │
    ├── LOST ────────────► EMD Refund Setup ─────────────────► 🩷 [PINK] Archive
    │
    ├── CANCEL ──────────► Retender option
    │
    ├── RETENDER ────────────────────────────────────────────► 🔵 [BLUE] (reset)
    │
    └── WON ─────────────► LOI Tracker per Dept
                                │
                        All LOIs received
                                │
                        LOA → PBG/Agreement (Accounts)
                                │
                          ► PROJECT STARTS
                                │
                       After Tenure Expires
                                │
                     O&M issues Completion Letter
                                │
                    Presales Head gives CLOSURE ✅

🟣 [PURPLE / USER SLOT 1-6]: Any tender can be ADDITIONALLY tagged with a user-defined
   color. User-defined color OVERRIDES the system color display (but system state still
   tracked internally).
```

### Key Rule for User Color Override:
- System color drives **workflow logic** (gates on what actions are allowed)
- User color slot is a **display override** — it changes what color the row shows
- In the "Color" column, a small icon shows if the color is system vs user-tagged

---

## 4. Color Legend & Customization Sub-Tab

### 4.1 Route
`/pre-sales/dashboard/color-config` (sub-tab inside Dashboard)

### 4.2 Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎨 Funnel Color Legend & Configuration                                     │
│  Understand what each color means and customize the 6 user-defined slots.   │
├──────────────────────┬──────────────────────────────────────────────────────┤
│ SYSTEM COLORS        │                                                       │
│ (Fixed — Read only)  │ LEGEND CARD per color:                                │
│                      │   [Color Swatch] Color Name                           │
│ 🔵 Blue              │   Label: "GO/NO-GO Evaluation"                        │
│ 🟡 Yellow            │   Description: "Tender arrived, team deciding..."     │
│ 🔴 Red               │   Stage trigger (when does this color appear)         │
│ 🟢 Green             │   Count: X tenders currently in this state            │
│ 🟠 Orange            │   [Lock icon] System-controlled — cannot change        │
│ 🩷 Pink              │                                                       │
├──────────────────────┤                                                       │
│ USER COLORS          │ EDITABLE CARD per slot:                               │
│ (Editable)           │   [Color Picker dropdown — 20 color options]          │
│                      │   Label input: "Type your label..."                   │
│ 🟣 Purple (Slot 1)   │   Description input: "Optional description..."        │
│ 🩵 Teal   (Slot 2)   │   Count: X tenders using this slot                    │
│ 🟤 Brown  (Slot 3)   │   [✎ Edit] [💾 Save]                                │
│ ⬛ DkGray (Slot 4)   │                                                       │
│ 🫐 Indigo (Slot 5)   │                                                       │
│ 🟫 Maroon (Slot 6)   │                                                       │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

### 4.3 Available Color Choices for User Slots (20 safe CSS colors)

```
Purple, Teal, Brown, DarkGray, Indigo, Maroon,
Violet, Cyan, Lime, SkyBlue, Rose, Fuchsia,
Amber, Emerald, Slate, Zinc, Coral, Navy,
Gold, Olive
```

### 4.4 Backend — `GE Presales Color Config` DocType (new, singleton)

| Field | Type | Purpose |
|-------|------|---------|
| `slot_1_color` | Select (20 options) | Display color for user slot 1 |
| `slot_1_label` | Data | User label for slot 1 |
| `slot_1_description` | Text | Description |
| `slot_2_color` | Select | — |
| `slot_2_label` | Data | — |
| `slot_2_description` | Text | — |
| ... (repeat for slots 3–6) | | |

### 4.5 How Color Override Works (Frontend)

```typescript
// In tenderFunnel.ts
function resolveTenderDisplayColor(tender, colorConfig) {
  // If tender has a user-assigned color slot, use that display color
  if (tender.user_color_slot) {
    const slot = colorConfig[`slot_${tender.user_color_slot}`];
    return slot ? slot : getSystemColor(tender); // fallback to system
  }
  // Otherwise derive from system state
  return getSystemColor(tender);
}
```

### 4.6 New Field on `GE Tender`

| Field | Type | Purpose |
|-------|------|---------|
| `user_color_slot` | Select (1–6 or blank) | Which user slot this tender is tagged with |
| `user_color_remarks` | Text | Why was this color manually assigned |

---

## 5. Advanced Filter System (15+ Filters)

### 5.1 Filter Categories

#### Category A — Text / Identity Filters
| Filter | Type | Options |
|--------|------|---------|
| **Search** | Text input | Searches: tender number, title, client, organization, consultant name |
| **Handle By (Assignee)** | Multi-select dropdown | All users with Presales role |
| **Client** | Multi-select dropdown | Distinct clients from data |
| **Organization** | Multi-select dropdown | Distinct organizations |
| **Consultant Name** | Text input | Free-text search |

#### Category B — Status / Lifecycle Filters
| Filter | Type | Options |
|--------|------|---------|
| **System Funnel Color** | Multi-select chip group | Blue, Yellow, Red, Green, Orange, Pink (ALL system colors) |
| **User Color Tag** | Multi-select chip group | Slot 1–6 (shows the user-defined labels) |
| **Tender Status** | Multi-select | DRAFT, SUBMITTED, UNDER_EVALUATION, WON, LOST, DROPPED, CANCELLED |
| **GO/NO-GO Status** | Select | PENDING, GO, NO_GO |
| **Technical Readiness** | Select | NOT_STARTED, IN_REVIEW, APPROVED, REJECTED |
| **Bid Status (Latest Bid)** | Multi-select | DRAFT, SUBMITTED, UNDER_EVALUATION, WON, LOST, CANCEL, RETENDER |
| **EMD Status** | Select | Required+Submitted, Required+Pending, Not Required |
| **Enquiry Pending** | Toggle | Yes / No |
| **PU-NZD Qualified** | Toggle | Yes / No |
| **LOI Status (for WON bids)** | Select | All Received, Partial, None |
| **Closure Status** | Select | Open, Tenure Expired, O&M Letter Done, Fully Closed |

#### Category C — Date Range Filters
| Filter | Type | Covers |
|--------|------|--------|
| **Submission / Closing Date** | Date range picker (from–to) | `submission_date` |
| **Bid Opening Date** | Date range picker | `bid_opening_date` |
| **Pre-Bid Meeting Date** | Date range picker | `pre_bid_meeting_date` |
| **Pre-Bid Query Date** | Date range picker | `pre_bid_query_submission_date` |
| **Corrigendum Date** | Date range picker | `latest_corrigendum_date` |
| **Tender Created Date** | Date range picker | `creation` |
| **Overdue Only** | Toggle | `submission_date` < today |
| **Due This Week** | Toggle | `submission_date` within 7 days |
| **Due This Month** | Toggle | `submission_date` within 30 days |

#### Category D — Value / Financial Filters
| Filter | Type | Covers |
|--------|------|--------|
| **Estimated Value (₹ Cr) range** | Range slider / min-max input | `estimated_value` |
| **EMD Amount range** | Min-max input | `emd_amount` |
| **PBG % range** | Min-max input | `pbg_percent` |

### 5.2 Filter UI Layout

```
┌─── FILTER STRIP (always visible) ─────────────────────────────────────────────┐
│ [🔍 Search...]  [Assignee ▾]  [Funnel Color ▾]  [Status ▾]  [Date Range ▾]   │
│ [🗓 Due: Any ▾]  [EMD ▾]  [Value ₹ ▾]  [More Filters ▾]  [Clear All]          │
└────────────────────────────────────────────────────────────────────────────────┘

When "More Filters" clicked → expands a drawer/panel with ALL remaining filters:
  ┌────────────────────────────────────────┐
  │ Advanced Filters                [✕]   │
  │                                        │
  │ GO/NO-GO:    [PENDING] [GO] [NO_GO]   │
  │ Technical:   [NOT_STARTED] [APPROVED] │
  │ Bid Status:  [WON] [LOST] [RETENDER]  │
  │ Enquiry:     ( ) All  (●) Yes ( ) No  │
  │ PU-NZD:      ( ) All  (●) Yes ( ) No  │
  │ Closing:     [From: ___] [To: ___]     │
  │ Bid Opening: [From: ___] [To: ___]     │
  │ Pre-bid Mtg: [From: ___] [To: ___]    │
  │ Corrigendum: [From: ___] [To: ___]    │
  │ Value (₹Cr): [Min: ___] [Max: ___]    │
  │ EMD (₹):     [Min: ___] [Max: ___]    │
  │ LOI Status:  [All ▾]                  │
  │ Closure:     [All ▾]                  │
  │                                        │
  │ [Apply Filters]   [Reset All]          │
  └────────────────────────────────────────┘
```

### 5.3 Active Filter Tags
When any filter is active, a chip row appears below the strip:
```
[🔵 Blue ×]  [Assignee: Nisha ×]  [Due: Mar 2026 ×]  [Clear All ×]
```

### 5.4 Filter Persistence
- Filters are saved to `localStorage` key `presales_dashboard_filters_v1`
- On page reload, same filters are restored
- "Clear All" button resets + clears localStorage

---

## 6. Default Sort & Sort Options

### 6.1 Default Sort
**Always: `submission_date ASC` (nearest closing date first)**
- Tenders with no submission date go to the bottom (treated as far future)
- This mirrors how the Excel tracker is prioritized

### 6.2 Sort Options (user can override via column header click or sort dropdown)

| Sort Option | Field | Direction |
|-------------|-------|-----------|
| **Closing Date ↑** *(default)* | `submission_date` | ASC |
| Closing Date ↓ | `submission_date` | DESC |
| Bid Opening Date ↑ | `bid_opening_date` | ASC |
| Value (High → Low) | `estimated_value` | DESC |
| Value (Low → High) | `estimated_value` | ASC |
| Funnel Color (A-Z) | derived `funnel_color` | ASC |
| EMD Amount ↓ | `emd_amount` | DESC |
| Created Date (Newest) | `creation` | DESC |
| Handle By (A-Z) | `tender_owner` | ASC |
| Corrigendum Date ↑ | `latest_corrigendum_date` | ASC |

Sort state shows in the column header with ↑/↓ arrow indicator.

---

## 7. Full Dashboard Page Layout (Updated)

### 7.1 Page Structure

```
/pre-sales/dashboard
├── Tab 1: Funnel View ← (default tab, the main table)
├── Tab 2: Color Legend & Config ← (new: 12-color documentation + user slot editor)
└── (future) Tab 3: Analytics Charts
```

### 7.2 Tab 1 — Funnel View

```
┌── Header ─────────────────────────────────────────────────────────────────────┐
│  Pre-Sales Funnel Dashboard           [+ New Tender]  [Export CSV]            │
│  Sort: Closing Date ↑ (default)                                               │
└───────────────────────────────────────────────────────────────────────────────┘

┌── Funnel Color Summary (12 tiles, 2 rows of 6) ──────────────────────────────┐
│ Row 1 (System):                                                               │
│ [🔵 Blue     4 | ₹12Cr] [🟡Yellow 3|₹8Cr] [🔴Red 2|₹3Cr]                  │
│ [🟢 Green    1 | ₹5Cr] [🟠Orange 5|₹22Cr] [🩷Pink 6|₹7Cr]                 │
│                                                                               │
│ Row 2 (User-Defined — shows only if count > 0 or configured):                │
│ [🟣 Slot1 Label 2|₹4Cr] [🩵Slot2 1|₹2Cr] [🟤Slot3 0|₹0] ...              │
└───────────────────────────────────────────────────────────────────────────────┘

┌── Quick Stats Bar ────────────────────────────────────────────────────────────┐
│ Total Pipeline: ₹57Cr | Active Bids: 3 | Won This Year: 1 | EMD Pending: 2  │
│ Overdue: 4 | Due This Week: 5 | No Submission Date: 8                        │
└───────────────────────────────────────────────────────────────────────────────┘

┌── Filter Strip ───────────────────────────────────────────────────────────────┐
│ [🔍 Search] [Assignee▾] [Color▾] [Status▾] [Date▾] [More Filters▾] [Clear]  │
│ Active: [🔵Blue ×] [Nisha ×]                               Showing 12 of 87 │
└───────────────────────────────────────────────────────────────────────────────┘

┌── Main Table ─────────────────────────────────────────────────────────────────┐
│ Col headers (clickable for sort):                                             │
│ # | Color | Handle By | Est.Value | Tender Name | Pre-Bid Query |             │
│   Pre-Bid Mtg | Submission Date ↑ | Bid Opening | EMD | PBG% | PBG Amt |     │
│   Instruments | Corrigendum | Enquiry | PU-NZD | Remarks | Consultant |      │
│   Bid Status | Actions                                                         │
│                                                                               │
│ Rows: color-tinted bg + left border stripe                                    │
│ → 🔵 row for Blue, 🟡 row for Yellow, etc.                                   │
│ → Due-soon rows get an additional ⚠ warning indicator                        │
│ → Overdue rows get a 🔴 indicator in submission date cell                    │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Tab 2 — Color Legend & Config

```
┌── Color Legend & Configuration ───────────────────────────────────────────────┐
│                                                                               │
│  SYSTEM COLORS (Fixed — Read Only)            USER COLORS (Editable)         │
│  ─────────────────────────────────────        ──────────────────────────────│
│  [🔵] Blue                                   [🟣] Slot 1                   │
│       GO/NO-GO Evaluation                          Label: [____________]      │
│       Tender newly received, under                 Color: [Purple    ▾]       │
│       go/no-go review by team.                     Desc:  [____________]      │
│       Currently: 4 tenders                         Currently: 2 tenders       │
│       🔒 System-controlled                         [Edit] [Save]              │
│                                                                               │
│  [🟡] Yellow                                  [🩵] Slot 2                   │
│       Technical Cleared                            Label: [____________]      │
│       ...                                          ...                        │
│  ...                                          ...                            │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Entity Model Changes (Updated)

### 8.1 `GE Tender` — Additional Fields (v2 additions)

| Field | Type | Purpose |
|-------|------|---------|
| (all fields from v1) | — | see original list |
| `user_color_slot` | Select (blank/1/2/3/4/5/6) | Which user-defined color slot is assigned |
| `user_color_remarks` | Short Text | Why manually tagged |

### 8.2 New Singleton DocType: `GE Presales Color Config`

| Field | Type | Purpose |
|-------|------|---------|
| `slot_1_color` | Select (20 color names) | Display hex for slot 1 |
| `slot_1_label` | Data (max 40 chars) | User label |
| `slot_1_description` | Text | Full description |
| `slot_2_color` | Select | — |
| `slot_2_label` | Data | — |
| `slot_2_description` | Text | — |
| `slot_3_color` thru `slot_6_color` | (same) | — |
| `slot_3_label` thru `slot_6_label` | (same) | — |
| `slot_3_description` thru `slot_6_description` | (same) | — |

---

## 9. Backend API Additions (v2)

### New Methods (in addition to v1 list)

```python
# ---- Color Config (Singleton) ----
get_presales_color_config()
  """Returns the 6 user-defined slot configs (label, color, description, count)."""

update_presales_color_config(slot, color, label, description)
  """Updates one user slot config. slot = 1-6."""

# ---- Tender User Color ----
assign_tender_user_color(tender_name, slot, remarks)
  """Assigns a user color slot to a tender. slot=blank to clear."""

# ---- Enhanced Funnel Stats (12 colors) ----
get_funnel_dashboard_stats()
  """Returns counts + pipeline values for ALL 12 color slots."""

# ---- Enhanced Funnel Tenders (all filters) ----
get_funnel_tenders(
  funnel_color=None,       # system color filter
  user_color_slot=None,    # user slot filter
  search=None,             # text search
  assignee=None,           # tender_owner
  client=None,
  organization=None,
  status=None,             # comma-separated statuses
  go_no_go=None,
  technical=None,
  bid_status=None,
  emd_status=None,
  enquiry_pending=None,
  pu_nzd=None,
  loi_status=None,
  closure_status=None,
  submission_date_from=None,
  submission_date_to=None,
  bid_opening_from=None,
  bid_opening_to=None,
  pre_bid_meeting_from=None,
  pre_bid_meeting_to=None,
  corrigendum_date_from=None,
  corrigendum_date_to=None,
  created_from=None,
  created_to=None,
  overdue_only=None,
  due_this_week=None,
  due_this_month=None,
  value_min=None,
  value_max=None,
  emd_min=None,
  emd_max=None,
  pbg_percent_min=None,
  pbg_percent_max=None,
  sort_by='submission_date',
  sort_dir='asc',
  page=1,
  limit=50,
)
```

---

## 10. Frontend Proxy Routes (Updated)

```
# Existing + new from v1:
GET  /api/presales/funnel-stats          ← now returns all 12 colors
GET  /api/presales/funnel-tenders        ← now accepts all 20+ filter params

# New in v2:
GET  /api/presales/color-config
PUT  /api/presales/color-config

PATCH /api/tenders/[id]/user-color       ← assign/clear user color slot
```

---

## 11. Frontend Components (Updated)

### 11.1 Updated Components List

| Component | Status | Notes |
|-----------|--------|-------|
| `FunnelColorCard` | 🔴 BUILD | Now renders all 12 tiles (system row + user row) |
| `FunnelTenderTable` | 🔴 BUILD | All Excel columns + Bid Status col + color-tinted rows |
| `FunnelFilterStrip` | 🔴 BUILD NEW | Always-visible primary filter bar |
| `FunnelAdvancedFilterDrawer` | 🔴 BUILD NEW | Slide-out advanced filter panel |
| `ActiveFilterChips` | 🔴 BUILD NEW | Shows active filter pills with × dismiss |
| `ColorLegendPage` | 🔴 BUILD NEW | Tab 2 content — system legend + user slot editor |
| `UserColorSlotCard` | 🔴 BUILD NEW | Single editable user color slot card |
| `ColorPickerDropdown` | 🔴 BUILD NEW | 20-color picker dropdown |
| `TenderUserColorModal` | 🔴 BUILD NEW | Modal to assign user color slot to a tender |
| `BidCreateModal` | 🔴 BUILD | (from v1) |
| `BidStatusPanel` | 🔴 BUILD | (from v1) |
| `LoiTrackerPanel` | 🔴 BUILD | (from v1) |
| `EmdRefundPanel` | 🔴 BUILD | (from v1) |
| `TenureClosureModal` | 🔴 BUILD | (from v1) |

### 11.2 Updated `tenderFunnel.ts`

```typescript
// Extended structure
export type FunnelSlot =
  | 'SYSTEM_GONOGO'        // Blue
  | 'SYSTEM_TECHNICAL'     // Yellow
  | 'SYSTEM_NOT_QUALIFIED' // Red
  | 'SYSTEM_BID_READY'     // Green
  | 'SYSTEM_LOCKED'        // Orange
  | 'SYSTEM_OBSERVATION'   // Pink
  | 'USER_SLOT_1'
  | 'USER_SLOT_2'
  | 'USER_SLOT_3'
  | 'USER_SLOT_4'
  | 'USER_SLOT_5'
  | 'USER_SLOT_6';

// System colors are fixed
export const SYSTEM_FUNNEL_COLORS: Record<string, string> = {
  SYSTEM_GONOGO:        '#3b82f6', // blue-500
  SYSTEM_TECHNICAL:     '#eab308', // yellow-500
  SYSTEM_NOT_QUALIFIED: '#ef4444', // red-500
  SYSTEM_BID_READY:     '#22c55e', // green-500
  SYSTEM_LOCKED:        '#f97316', // orange-500
  SYSTEM_OBSERVATION:   '#ec4899', // pink-500
};

// User slot default colors (overridable)
export const USER_SLOT_DEFAULT_COLORS: Record<string, string> = {
  USER_SLOT_1: '#a855f7', // purple-500
  USER_SLOT_2: '#14b8a6', // teal-500
  USER_SLOT_3: '#92400e', // brown-ish amber-900
  USER_SLOT_4: '#374151', // gray-700
  USER_SLOT_5: '#4f46e5', // indigo-600
  USER_SLOT_6: '#9f1239', // maroon-ish rose-900
};

// Resolution function
export function resolveTenderDisplaySlot(
  tender: TenderFunnelSignals & { user_color_slot?: string },
  activeBidStatus?: string
): FunnelSlot {
  // User override takes priority for DISPLAY (not logic)
  if (tender.user_color_slot) {
    return `USER_SLOT_${tender.user_color_slot}` as FunnelSlot;
  }
  // Derive system slot
  return deriveSystemFunnelSlot(tender, activeBidStatus);
}

// Get display meta (respects user color config)
export function getResolvedFunnelMeta(
  slot: FunnelSlot,
  colorConfig?: PresalesColorConfig
): FunnelDisplayMeta {
  if (slot.startsWith('USER_SLOT_')) {
    const slotNum = slot.replace('USER_SLOT_', '');
    const config = colorConfig?.[`slot_${slotNum}`];
    const color = config?.color || USER_SLOT_DEFAULT_COLORS[slot];
    const label = config?.label || `Custom ${slotNum}`;
    return buildMetaFromHex(color, label);
  }
  return SYSTEM_FUNNEL_DISPLAY[slot];
}
```

---

## 12. Updated Implementation Phases

### Phase 1 — Backend DocTypes & Fields
- [ ] Create `GE Bid` DocType
- [ ] Create `GE LOI Tracker` DocType
- [ ] Create `GE Presales Color Config` DocType (singleton)
- [ ] Extend `GE Tender` with new fields (v1 fields + `user_color_slot`, `user_color_remarks`)
- [ ] Extend `GE EMD PBG Instrument` with refund fields
- [ ] `bench migrate`

### Phase 2 — Backend APIs
- [ ] All Bid CRUD + lifecycle (from v1)
- [ ] LOI Tracker CRUD + mark-received
- [ ] EMD refund update
- [ ] Tender closure APIs
- [ ] `get_presales_color_config()` + `update_presales_color_config()`
- [ ] `assign_tender_user_color()`
- [ ] `get_funnel_dashboard_stats()` — full 12-color counts
- [ ] `get_funnel_tenders()` — with ALL 20+ filter parameters + sort support

### Phase 3 — Frontend Proxy Routes
- [ ] All from v1
- [ ] `GET/PUT /api/presales/color-config`
- [ ] `PATCH /api/tenders/[id]/user-color`
- [ ] Update `GET /api/presales/funnel-stats` to pass 12 colors
- [ ] Update `GET /api/presales/funnel-tenders` to pass all filter params

### Phase 4 — Color System & Filter Infrastructure
- [ ] Extend `tenderFunnel.ts` for 12-color system + user config resolution
- [ ] Build `ColorPickerDropdown` component
- [ ] Build `UserColorSlotCard` component
- [ ] Build `ColorLegendPage` component (Tab 2)
- [ ] Build `FunnelFilterStrip` (primary filter bar)
- [ ] Build `FunnelAdvancedFilterDrawer` (all 20+ filters)
- [ ] Build `ActiveFilterChips` with dismiss
- [ ] Implement filter state with localStorage persistence

### Phase 5 — Dashboard Page
- [ ] Build `FunnelColorCard` (12 tiles — system row + user row)
- [ ] Build `FunnelTenderTable` with:
  - All Excel columns + Bid Status column
  - Color-tinted rows + left stripe
  - Sortable column headers (click to sort)
  - Default sort: submission_date ASC
  - Overdue indicator (🔴 in date cell)
  - Due-soon indicator (⚠ badge in 7 days)
- [ ] Wire up `/pre-sales/dashboard` page with 2 tabs
- [ ] `TenderUserColorModal` for assigning user color to a tender

### Phase 6 — Tender Workspace Additions
- [ ] "Bid" section + `BidCreateModal` + `BidStatusPanel`
- [ ] EMD Refund sub-section (`EmdRefundPanel`)
- [ ] LOI Tracker sub-section (`LoiTrackerPanel`)
- [ ] "Tenure & Closure" section (`TenureClosureModal`)

### Phase 7 — Navigation & Integration
- [ ] Sidebar: Add Dashboard, Bids, Won Bids & LOI links
- [ ] Update `in-process/page.tsx` to redirect/link to dashboard
- [ ] Update pre-sales home (`/pre-sales/page.tsx`) to link to dashboard

### Phase 8 — QA
- [ ] All lifecycle flows (Blue → won → LOI → project)
- [ ] NO-GO → Pink, Lost → EMD refund, Retender
- [ ] All 20+ filter combinations
- [ ] Default sort order verified
- [ ] User color slot: change color → all affected tenders update
- [ ] User color slot: assign to tender → row tint changes
- [ ] Color Legend tab: save changes persist after page reload
- [ ] Filter persistence across page reloads

---

## 13. Updated File List

### New Files
```
# Backend
backend/.../doctype/ge_bid/
backend/.../doctype/ge_loi_tracker/
backend/.../doctype/ge_presales_color_config/      ← NEW (singleton config)

# Frontend Pages
erp_frontend/src/app/pre-sales/dashboard/page.tsx
erp_frontend/src/app/pre-sales/bids/page.tsx
erp_frontend/src/app/pre-sales/won-bids/page.tsx

# Frontend API Routes
erp_frontend/src/app/api/presales/funnel-stats/route.ts
erp_frontend/src/app/api/presales/funnel-tenders/route.ts
erp_frontend/src/app/api/presales/color-config/route.ts      ← NEW
erp_frontend/src/app/api/tenders/[id]/user-color/route.ts    ← NEW
erp_frontend/src/app/api/bids/route.ts
erp_frontend/src/app/api/bids/[id]/route.ts
erp_frontend/src/app/api/bids/[id]/submit/route.ts
erp_frontend/src/app/api/bids/[id]/under-evaluation/route.ts
erp_frontend/src/app/api/bids/[id]/won/route.ts
erp_frontend/src/app/api/bids/[id]/lost/route.ts
erp_frontend/src/app/api/bids/[id]/cancel/route.ts
erp_frontend/src/app/api/bids/[id]/retender/route.ts
erp_frontend/src/app/api/loi-tracker/route.ts
erp_frontend/src/app/api/loi-tracker/[id]/received/route.ts
erp_frontend/src/app/api/emd-refund/[id]/route.ts
erp_frontend/src/app/api/tenders/[id]/closure/route.ts

# Frontend Components
erp_frontend/src/components/presales/FunnelColorCard.tsx
erp_frontend/src/components/presales/FunnelTenderTable.tsx
erp_frontend/src/components/presales/FunnelFilterStrip.tsx        ← NEW
erp_frontend/src/components/presales/FunnelAdvancedFilterDrawer.tsx ← NEW
erp_frontend/src/components/presales/ActiveFilterChips.tsx         ← NEW
erp_frontend/src/components/presales/ColorLegendPage.tsx           ← NEW
erp_frontend/src/components/presales/UserColorSlotCard.tsx         ← NEW
erp_frontend/src/components/presales/ColorPickerDropdown.tsx       ← NEW
erp_frontend/src/components/presales/TenderUserColorModal.tsx      ← NEW
erp_frontend/src/components/presales/BidCreateModal.tsx
erp_frontend/src/components/presales/BidStatusPanel.tsx
erp_frontend/src/components/presales/LoiTrackerPanel.tsx
erp_frontend/src/components/presales/EmdRefundPanel.tsx
erp_frontend/src/components/presales/TenureClosureModal.tsx
```

### Modified Files
```
backend/.../api.py                              ← ~25 new methods
backend/.../doctype/ge_tender/ge_tender.json    ← new fields incl. user_color_slot
backend/.../doctype/ge_emd_pbg_instrument/...   ← refund fields
erp_frontend/src/components/tenderFunnel.ts     ← full 12-color system
erp_frontend/src/components/Sidebar.tsx         ← new nav items
erp_frontend/src/app/pre-sales/[id]/page.tsx    ← Bid + LOI + Closure sections
erp_frontend/src/app/pre-sales/tender-task/in-process/page.tsx ← redirect
```

---

## 14. Success Criteria (Updated — Full 12-Color + Filter System)

### Core Funnel
1. ✅ Pre-Sales Dashboard shows tenders sorted by closing date (nearest first) by default
2. ✅ 12 color tiles at top (6 system + 6 user) with count and pipeline value
3. ✅ System colors auto-derive from tender lifecycle state
4. ✅ GO/NO-GO decision: Blue → Yellow or Pink
5. ✅ Technical rejection → Red, approval → Yellow → Green (after EMD)
6. ✅ Bid submit → Orange. Won → LOI tracking. Lost → EMD refund.
7. ✅ Retender → back to Blue

### Color Customization
8. ✅ Color Legend tab shows all 12 colors with descriptions
9. ✅ 6 user slots are editable: label, color (20 choices), description
10. ✅ Changing a slot's color updates all tenders tagged with that slot immediately
11. ✅ Assigning a user slot to a tender changes that row's color on the dashboard
12. ✅ System colors show lock icon — cannot be edited

### Filter System
13. ✅ Search works across tender number, title, client, organization, consultant
14. ✅ Assignee filter (single or multi-select) works
15. ✅ Date range filters work for all 5 date fields
16. ✅ Status multi-select filter works
17. ✅ "Due This Week" / "Overdue Only" toggles work
18. ✅ Value range filter (₹ min–max) works
19. ✅ Active filter chips show and can be individually dismissed
20. ✅ Filters persist across page reload (localStorage)
21. ✅ "Clear All" removes all filters and resets to default

### Sort
22. ✅ Default sort is submission_date ASC (nearest first)
23. ✅ Clicking any column header toggles sort ASC/DESC for that column
24. ✅ Sort arrow indicator visible in active sort column header
25. ✅ Tenders with no submission date appear at the bottom

### General
26. ✅ All existing Pre-Sales pages unbroken
27. ✅ Bid lifecycle end-to-end works
28. ✅ Tenure closure flow works
