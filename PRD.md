# CalcPlus - Product Requirements Document

**Version:** 1.0  
**Date:** October 3, 2026  
**Status:** Draft  

---

## 1. Overview

CalcPlus is a mobile application that combines a standard calculator with a foreign exchange (FX) currency converter. Users can seamlessly switch between calculator mode and FX converter mode using a floating action button (FAB).

## 2. Product Goals

- Provide a dual-purpose utility app for everyday calculations and currency conversion
- Deliver reliable, up-to-date FX rates with automatic failover
- Offer intuitive mode switching and currency management

---

## 3. Features

### 3.1 Calculator Mode

**Description:** Standard basic calculator functionality.

**Requirements:**
- Support basic arithmetic operations: addition, subtraction, multiplication, division
- Clear (C) and clear entry (CE) functions
- Decimal point input
- Percentage calculation
- Positive/negative toggle
- Display showing current input and operation history

### 3.2 FX Converter Mode

**Description:** Currency converter with multiple currency support and a persistent base currency.

**Requirements:**

#### 3.2.1 Base Currency (Sticky)
- A "base" currency displayed at the top of the screen
- User enters an amount in the base currency
- All other selected currencies display converted values below

#### 3.2.2 Currency List
- Display multiple target currencies below the base currency
- Each target currency shows:
  - Currency code (e.g., USD, EUR, JPY)
  - Currency name
  - Converted amount based on current rates
- Scrollable list for many currencies
- Currencies are removed by long-pressing to pull up a "delete" dialog for confirmation
- Each currency numeric field is editable so that changing its value will re-calculate the relative values for all of the other currencies, including the base currency
 
#### 3.2.3 Rate Refresh
- Dedicated UI element (button) to manually refresh FX rates
- Display "freshness" indicator showing time since last update
- Time format: human-readable relative time (e.g., "last updated 12.08 minutes ago", "last updated 2 hours ago")
- Auto-refresh when app returns from background if rates are stale (>1 hour)

#### 3.2.4 Decimal Precision
- User-configurable decimal precision for FX rates in app settings
- Options: 2, 3, 4, 5, or 6 decimal places
- Default: 4 decimal places

### 3.3 Mode Switching

**Description:** Toggle between Calculator and FX Converter modes.

**Requirements:**
- Floating Action Button (FAB) overlay visible on both modes
- Single tap to toggle between Calculator ↔ FX Converter
- FAB icon changes to indicate the opposite mode (e.g., calculator icon when in FX mode, currency icon when in calculator mode)
- Smooth transition animation between modes

---

## 4. FX API Integration

### 4.1 Data Sources

**Requirement:** Two free FX API providers for redundancy.

**Recommended APIs:**
| Priority | Provider | Endpoint | Free Tier |
|----------|----------|----------|-----------|
| Primary | ExchangeRate-API | `https://open.er-api.com/v6/latest/{BASE}` | 1,500 requests/month |
| Fallback | Frankfurter | `https://api.frankfurter.app/latest?from={BASE}` | Unlimited |

### 4.2 Rate Liveness

- Maximum acceptable rate age: **1 hour**
- Rates older than 1 hour trigger auto-refresh on next FX mode entry
- Display staleness warning if rates exceed 1 hour

### 4.3 Failover Logic

```
1. Attempt Primary API (timeout: 10 seconds)
2. If primary fails (timeout/error/unresponsive):
   - Attempt Fallback API (timeout: 10 seconds)
3. If both fail:
   - Display last known rates with "⚠️ Rates may be outdated" warning
   - Show "Update failed" message
4. Retry primary API on next refresh attempt
```

### 4.4 API Status Monitoring

**Requirement:** Real-time API endpoint status displayed in Settings.

| Status | Indicator | Meaning |
|--------|-----------|---------|
| 🟢 Live | Green | API responding normally |
| 🟡 Timeout | Yellow | API responding slowly (>10s) or intermittently failing |
| 🔴 Dead | Red | API unresponsive for **>24 hours** consecutively |

**Behavior:**
- Status updates on each API call attempt
- "Dead" status persists until successful response received
- Both primary and fallback statuses shown independently

---

## 5. App Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Default Mode | Mode shown on app launch (Calculator / FX Converter) | Calculator |
| Decimal Precision | Number of decimal places for FX rates | 4 |
| Manage Currencies | Add/remove/reorder target currencies | — |
| Edit Base Currency | Change the sticky base currency | Device locale currency |
| Primary API Status | Real-time status indicator | 🟢 Live |
| Fallback API Status | Real-time status indicator | 🟢 Live |
| Last Successful Refresh | Timestamp of last rate fetch | — |

### 5.1 Currency Management

- Add currencies from a searchable list of all supported currencies
- Remove currencies from the active list
- Reorder currencies via drag-and-drop
- Set/change the base currency from the full currency list
- Persist currency preferences locally

---

## 6. Non-Functional Requirements

| Requirement | Specification |
|-------------|---------------|
| Platform | iOS and Android |
| Offline Support | Show last cached rates with staleness indicator |
| Local Storage | Cache rates, currency preferences, settings |
| API Timeout | 10 seconds per request |
| Rate Cache TTL | 1 hour |
| Min OS | iOS 15+ / Android 10+ |

---

## 7. User Flow

```
┌─────────────────────────────────────────────┐
│                App Launch                    │
│         (Default: Calculator Mode)           │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌───────────────┐   ┌───────────────────┐
│  Calculator   │   │   FX Converter    │
│    Mode       │   │      Mode         │
│               │   │                   │
│  [FAB: 💱]    │   │  Base: USD ────   │
│               │   │  EUR: 0.9234     │
│               │   │  JPY: 149.52     │
│               │   │  GBP: 0.7891     │
│               │   │                   │
│               │   │  [Refresh 🔄]     │
│               │   │  "Updated 5m ago" │
│               │   │                   │
│               │   │  [FAB: 🔢]        │
└───────────────┘   └───────────────────┘
        │                   │
        └─────────┬─────────┘
                  │
                  ▼
        ┌─────────────────┐
        │    Settings      │
        │                  │
        │ • Decimal: 4     │
        │ • Currencies     │
        │ • API Status:    │
        │   🟢 Primary     │
        │   🟢 Fallback    │
        └─────────────────┘
```

---

## 8. Success Metrics

- App launches to usable state in <2 seconds
- FX rate refresh completes in <3 seconds (on normal connection)
- Failover to backup API is seamless (no user action required)
- Zero data loss for cached rates during offline periods

---

## 9. Open Questions

1. Should the app support cryptocurrency conversions?
2. Historical rate charts — future feature?
3. Should the calculator support scientific functions?
4. What is the target number of supported currencies?
5. Should rate alerts/notifications be a feature?

---

*End of PRD*
