# Fake Location Detection — Check-in / Check-out Hardening

## Background

Currently the system:
- Requests GPS coords via `navigator.geolocation` on the **client** (browser)
- Sends `lat` / `lng` to the server which runs a Haversine distance check against assigned geofences
- Blocks if the employee is outside all assigned fences **and** not on an authorized network

**The weakness**: `navigator.geolocation` is fully spoofable. A browser extension, a rooted phone app, or DevTools alone can return any arbitrary coordinates.  
There is **no signal today** to distinguish a real GPS fix from a spoofed one.

---

## Layers of Defense (Ordered by Effort / Impact)

### Layer 1 — Browser / OS Signals (Client-side, LOW effort)

Detect known indicators of mock-location environments:

| Signal | How to check | What it reveals |
|---|---|---|
| **Accuracy** | `p.coords.accuracy` | Spoofed locations often return unrealistically high accuracy (< 5 m) |
| **Speed / Altitude** | `p.coords.speed`, `p.coords.altitude` | Mock providers often return `null` for these |
| **Mock flag (Android)** | Not exposed to browser | Only available in native apps |
| **VPN / proxy** | Server-side IP check | Employees using VPN to tunnel to office IP |
| **Time-to-fix** | Measure `Date.now()` before/after `getCurrentPosition` | Spoofed fixes are **instantaneous** (< 50 ms); real GPS takes 1–5 s |
| **Consecutive position variance** | Take 3 readings with 2 s gap; compare them | Spoofed location is perfectly static; real GPS jiggles slightly |

> [!IMPORTANT]
> Layer 1 adds **friction and audit signals** but cannot fully stop a determined attacker. Combine with Layers 2–3.

---

### Layer 2 — Server-side Anomaly Scoring (Backend, MEDIUM effort)

Add a `location_risk_score` column to `attendance`. On every check-in:

1. **Accuracy threshold**: If `accuracy < 5 m` → flag (suspicious)
2. **Speed-to-location jump**: Compare to last check-in coords. If distance > expected travel since last check-out → flag
3. **IP geolocation cross-check**: Resolve the server-request IP via a free API (e.g. `ip-api.com`). If IP geo-country ≠ Egypt → block. If IP city is wildly different from GPS city → flag.
4. **Reverse geocode consistency**: We already call BigDataCloud. If the reverse-geocoded city differs from the employee's assigned branch city → flag.
5. **Accumulate flags → risk score** (0–100). Store on the attendance row. Surface suspicious rows in the admin attendance view.

> [!NOTE]
> This does NOT hard-block on its own (to avoid false positives) but flags rows for HR review.

---

### Layer 3 — Hard Block on High-Confidence Spoofing Signals (Backend, LOW effort after Layer 1)

Block check-in immediately if **both** of:
- `accuracy` reported by browser is < 5 m (unrealistic for real GPS), **AND**
- No authorized network match (network match is a strong local signal)

Also hard-block if:
- Employee's IP geolocates outside Egypt (configurable country whitelist)

---

### Layer 4 — Network (Wi-Fi / IP) as Primary Signal (Already partly built)

The current system accepts an SSID match as an alternative to GPS. Strengthen this:

- **SSID alone is spoofable** (any device can broadcast any SSID name). Also validate the **BSSID** (MAC address of the access point) if available via native app.
- For the web app: make **network match the preferred/trusted path** and treat GPS-only check-ins as lower trust.
- Store a `check_method` column: `'network'` | `'gps'` | `'free'`. Admins can filter by method.

---

### Layer 5 — Progressive Trust via Biometrics (Already built — enforce more strictly)

Face verification is already required (`requiresBio = true`). This is good — it proves presence of the person. But:
- The face check happens **client-side before** coordinates are gathered.
- Move face verification to happen **after** coords are confirmed, so a spoofer can't pre-verify face at home.

> [!WARNING]
> Currently face verification happens in a separate step before `go()` is called. The sequence should be: gather coords → verify face → submit. This prevents pre-verification at a different location.

---

## Proposed Changes

### Layer 1 + 3 — Client: collect richer signals

#### [MODIFY] [employee.check.tsx](file:///d:/int/int-hr-app2/src/routes/employee.check.tsx)

- Collect **3 GPS readings** with 2 s gaps and measure variance + time-to-fix
- Pass `accuracy`, `altitude`, `speed`, `time_to_fix_ms` to the server payload
- Show a warning if accuracy > 500 m ("GPS signal is weak")
- **Block locally** if `time_to_fix_ms < 100` AND `accuracy < 5` (mock provider signature)

#### [MODIFY] [schemas/index.ts](file:///d:/int/int-hr-app2/src/backend/schemas/index.ts)

- Add `accuracy`, `altitude`, `speed`, `time_to_fix_ms`, `ip` to `AttendanceCheckSchema`

---

### Layer 2 + 3 — Server: scoring & hard blocks

#### [MODIFY] [attendance.functions.ts](file:///d:/int/int-hr-app2/src/backend/functions/attendance.functions.ts)

In the `checkIn` handler, after geofence check:

1. **IP geolocation check**: Fetch `https://ip-api.com/json/{ip}?fields=country,city,status` using the forwarded IP from the request headers. Block if `country !== "EG"` (configurable).
2. **Accuracy spoofing check**: If `accuracy < 5 m` AND no network match → add high-risk flag; optionally hard-block.
3. **Time-to-fix check**: If `time_to_fix_ms < 100` → flag as instant fix (mock provider).
4. **Speed sanity**: If employee's last checkout was at coords X and new check-in is at coords Y, and the distance implies they'd need to travel faster than physically possible → block.
5. Store `location_risk_score` (0–100) and `check_method` on the attendance row.

#### [NEW] Migration: add columns to `attendance`

```sql
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS accuracy        float,
  ADD COLUMN IF NOT EXISTS time_to_fix_ms  int,
  ADD COLUMN IF NOT EXISTS location_risk   int DEFAULT 0,   -- 0-100
  ADD COLUMN IF NOT EXISTS check_method    text DEFAULT 'gps',  -- 'gps'|'network'|'free'
  ADD COLUMN IF NOT EXISTS ip_country      text,
  ADD COLUMN IF NOT EXISTS ip_city         text;
```

---

### Layer 5 — Reorder biometric + GPS flow

#### [MODIFY] [employee.check.tsx](file:///d:/int/int-hr-app2/src/routes/employee.check.tsx)

Change the flow:
1. Employee taps "Check in"
2. **GPS is collected first** (before showing the face modal)
3. If outside fence → show error immediately (no face verification needed)
4. If within fence → **then** show face verification modal
5. On face pass → submit payload

This prevents someone from verifying their face at home and then spoofing the GPS for the submission.

---

## Verification Plan

### Manual
- Test with browser DevTools → Sensors → Custom location → check-in should fail or be flagged
- Test with a VPN set to a non-EG server → should be blocked
- Test normal check-in on a real device at the office → should pass cleanly

### Admin-facing
- Add a **🚨 Risk** column in the admin attendance table, color-coded by `location_risk` score
- High-risk rows (> 60) shown in red; HR reviews them

---

## Open Questions

> [!IMPORTANT]
> 1. **Hard block or soft flag for GPS accuracy < 5 m?** Hard blocking may cause false positives for employees with very good GPS chips. Recommend: flag + require HR approval for that day's attendance.
> 2. **Country whitelist**: Should check-in from outside Egypt always block, or only flag? (Some remote employees may be abroad.)
> 3. **IP geolocation API**: `ip-api.com` has a free tier (45 req/min). Should we use it or a paid service?
> 4. **BSSID**: Available only in native apps. Should we build a React Native companion app later for stronger Wi-Fi proof?
