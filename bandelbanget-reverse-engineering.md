# BandelBanget AI — Reverse Engineering

Base URL: `https://bandelbanget.xyz`
Quota Token: `6589ae919962973d43cde8e8d1275bb2c37b82d27f924a5123fe1e5a84485255`
PIN: `111111`

---

## 1. Authentication Flow

### 1.1 Fetch Quota Meta (no auth)
```
GET /api/public/quota/{token}
```
Response:
```json
{
  "pinSet": true,
  "pinLockedUntil": null,
  "keyRegeneratedAt": null,
  "pinChangedAt": null
}
```

### 1.2 Verify PIN → get accessToken
```
POST /api/public/quota/{token}/verify-pin
Content-Type: application/json

{ "pin": "111111" }
```
Response (success):
```json
{ "accessToken": "eyJhbGciOi..." }
```
Response (fail):
```json
{ "error": "PIN salah", "attemptsLeft": 4, "lockedUntil": null }
```

### 1.3 Setup PIN (jika pinSet=false)
```
POST /api/public/quota/{token}/setup-pin
Content-Type: application/json

{ "pin": "123456", "confirmPin": "123456" }
```

### 1.4 Change PIN
```
POST /api/public/quota/{token}/change-pin
Authorization: Bearer {accessToken}
Content-Type: application/json

{ "oldPin": "111111", "newPin": "222222", "confirmNewPin": "222222" }
```
Cooldown: 1 jam setelah ganti PIN.

### 1.5 Regenerate API Key
```
POST /api/public/quota/{token}/regenerate-key
Authorization: Bearer {accessToken}
```
Cooldown: 1 jam setelah regenerate.

### 1.6 Admin Reset PIN
```
POST /api/customer-keys/{keyId}/reset-pin
```
(cookie admin auth)

---

## 2. Auth Header Pattern

Setelah verify-pin, semua request data butuh:
```
Authorization: Bearer {accessToken}
```

Token disimpan di `sessionStorage` key: `bb_dash_access_{token}`

---

## 3. Quota Dashboard Endpoints

### 3.1 Load Dashboard Data (utama)
```
GET /api/public/quota/{token}/data
Authorization: Bearer {accessToken}
```
Response: object berisi `id`, `name`, `key`, `balance`, `usage`, `modelMultipliers`, `resellerId`, `resellerQuota`, `resellerBalance`, `resellerPhone`, `bankName`, `accountName`, `accountNumber`, `resellerExpiresAt`, `keyRegeneratedAt`, `pinChangedAt`, dll.

### 3.2 Customer Activity Log
```
GET /api/public/quota/{token}/activity?type={filter}
Authorization: Bearer {accessToken}
```
Response: `{ "logs": [...] }`

### 3.3 Customer Model Config — Load
```
GET /api/public/quota/{token}/models-config
Authorization: Bearer {accessToken}
```
Response: `{ "allModels": [...], "allEnabled": bool, "enabledModels": [...] }`

### 3.4 Customer Model Config — Save
```
PUT /api/public/quota/{token}/models-config
Authorization: Bearer {accessToken}
Content-Type: application/json

{ "enabledModels": null }          // null = semua model aktif
{ "enabledModels": ["gpt-4o"] }    // array = whitelist
```

### 3.5 Available Models (OpenAI-compatible)
```
GET /v1/models
Authorization: Bearer {apiKey}
```
Response: `{ "data": [{ "id": "gpt-4o", ... }] }`

---

## 4. Public Endpoints (no auth)

### 4.1 Leaderboard / Ranks
```
GET /api/public/ranks
```

### 4.2 Tutorials
```
GET /api/public/tutorials
```
Response: `{ "data": [...] }`

### 4.3 Announcements (paginated)
```
GET /api/public/announcements?page={page}&limit={limit}
```

### 4.4 Latest Announcement
```
GET /api/public/announcements/latest
```
Response: `{ "announcement": {...} | null }`

### 4.5 Pricing
```
GET /api/pricing
```
Response: `{ "tiers": [...], "flashSaleEnabled": bool }`

### 4.6 Check Auth (admin)
```
GET /api/me
```
(cookie auth) → cek apakah user adalah admin

---

## 5. Reseller Endpoints (public, but need secretToken)

### 5.1 Generate Reseller ID
```
POST /api/public/reseller/generate-id
Content-Type: application/json

{
  "secretToken": "{token}",
  "invitationCode": "...",
  "referralCode": "..."          // optional
}
```
Response: `{ "resellerId": "...", "referralCode": "...", "balance": 0 }`

### 5.2 List Reseller Keys
```
GET /api/public/reseller/keys?token={token}
```
Response: `{ "keys": [...], "resellerApiKey": "..." }`

### 5.3 Save Reseller Phone
```
PUT /api/public/reseller/phone
Content-Type: application/json

{ "secretToken": "{token}", "resellerPhone": "08123456789" }
```

### 5.4 Save Customer Tag
```
PUT /api/public/reseller/customer-tag
Content-Type: application/json

{ "secretToken": "{token}", "targetKeyId": "...", "tag": "..." }
```

### 5.5 Create Customer Key
```
POST /api/public/reseller/create-key
Content-Type: application/json

{
  "secretToken": "{token}",
  "maxTokens": 5000000,
  "validDays": 7              // 7 | 14 | 21 | 28
}
```
Response: `{ "remainingQuota": ..., "dashboardUrl": "..." }`

### 5.6 Add Quota to Customer Key
```
POST /api/public/reseller/add-quota
Content-Type: application/json

{
  "secretToken": "{token}",
  "targetKeyId": "...",
  "addTokens": 5000000,
  "validDays": 7
}
```

### 5.7 Delete Customer Key
```
DELETE /api/public/reseller/delete-key
Content-Type: application/json

{ "secretToken": "{token}", "targetKeyId": "..." }
```
Response: `{ "remainingQuota": ..., "refunded": ... }`
Hanya bisa hapus key yang belum dipakai (`usage.total_tokens === 0`).

### 5.8 Reseller Activity Log
```
GET /api/public/reseller/activity?token={token}&type={filter}
```
Response: `{ "logs": [...] }`

Activity types: `RESELLER_REGISTER`, `KEY_CREATED`, `QUOTA_ADDED`, `KEY_DELETED`, `ADMIN_ADD_QUOTA`, `ADMIN_REMOVE_RESELLER`

---

## 6. Reseller Topup (QRIS / Midtrans)

### 6.1 Create Topup Order
```
POST /api/public/reseller/topup
Content-Type: application/json

{ "secretToken": "{token}", "tierId": "..." }
```
Response: `{ "success": true, "orderId": "...", "snapToken": "...", "clientKey": "...", "isProduction": bool, "redirectUrl": "...", "expiryAt": ... }`

### 6.2 Check Topup Status
```
GET /api/public/reseller/topup/status?token={token}&orderId={orderId}
```
Response: `{ "success": true, "transaction": { "status": "settlement|pending|cancel|expire|deny|failure", "orderId": "...", ... } }`

### 6.3 Topup History
```
GET /api/public/reseller/topup?token={token}
```
Response: `{ "transactions": [...] }`

---

## 7. Reseller Referral & Withdraw

### 7.1 Referral Stats
```
GET /api/public/reseller/referral-stats?token={token}
```

### 7.2 Create Invitation
```
POST /api/public/reseller/invite
Content-Type: application/json

{ "secretToken": "{token}" }
```
Response: `{ "name": "...", ... }`

### 7.3 Save Bank Info
```
PUT /api/public/reseller/bank-info
Content-Type: application/json

{
  "secretToken": "{token}",
  "bankName": "...",
  "accountName": "...",
  "accountNumber": "..."
}
```

### 7.4 Request Withdraw
```
POST /api/public/reseller/withdraw
Content-Type: application/json

{
  "secretToken": "{token}",
  "amount": 100000,           // min 100000
  "bankName": "...",
  "accountName": "...",
  "accountNumber": "..."
}
```
Response: `{ "remainingBalance": ... }`

### 7.5 Withdrawal History
```
GET /api/public/reseller/withdrawals?token={token}
```
Response: `{ "withdrawals": [...] }`
Status: `pending | approved | rejected`

---

## 8. Reseller API v1 (Bearer resellerApiKey)

Base URL: `https://bandelbanget.xyz/api/reseller/v1`

### 8.1 Check Reseller Quota
```
GET /api/reseller/v1/quota
Authorization: Bearer {resellerApiKey}
```

### 8.2 Create Customer Key
```
POST /api/reseller/v1/customer-keys
Authorization: Bearer {resellerApiKey}
Content-Type: application/json

{ "name": "Customer Baru", "maxTokens": 5000000, "validDays": 7 }
```

### 8.3 List Topup Tiers
```
GET /api/reseller/v1/customer-topup-tiers
Authorization: Bearer {resellerApiKey}
```

### 8.4 Topup Customer Key
```
POST /api/reseller/v1/customer-keys/topup
Authorization: Bearer {resellerApiKey}
Content-Type: application/json

{ "hashtag": "#BawangMerah", "tierId": "5m" }
```

### 8.5 Create Invitation
```
POST /api/reseller/v1/invitations
Authorization: Bearer {resellerApiKey}
```

---

## 9. Admin Endpoints (cookie auth)

### 9.1 Reseller Topup Management
```
GET  /api/admin/reseller-topup?{params}
GET  /api/admin/reseller-topup/stats
GET  /api/admin/reseller-topup/{orderId}
POST /api/admin/reseller-topup/{orderId}/recheck
POST /api/admin/reseller-topup/{orderId}/settle
POST /api/admin/reseller-topup/{orderId}/cancel
```

### 9.2 Manual Commission
```
POST /api/admin/reseller/{resellerId}/manual-commission
Content-Type: application/json

{ "amount": 50000, "note": "..." }
```

### 9.3 Pricing Management
```
GET /api/pricing
PUT  /api/pricing/{tierId}              // update tier
PUT  /api/pricing/flash-sale            // { "enabled": bool }
```

### 9.4 Customer Key Reset PIN
```
POST /api/customer-keys/{keyId}/reset-pin
```

---

## 10. DOM Structure (key elements)

### 10.1 PIN Gate
```
.public-pin-stage
  .pin-gate
    input[type=password][maxlength=6]   ← v-model="pinInput"
    button.btn-primary                   ← @click="submitVerifyPin()"
```

### 10.2 Dashboard Layout (macOS-style window)
```
.public-mac-desktop
  .public-window
    .public-window-titlebar
    .public-content-wrap
      .public-pin-stage | main content
```

### 10.3 Quota Stats Grid
```
.quota-stats-grid
  .quota-stat-card
    .quota-stat-icon
    .quota-stat-info
      .quota-stat-label
      .quota-stat-value
      .quota-stat-meta
```

### 10.4 Quota Bar
```
.quota-bar
  .quota-bar-fill.quota-bar-ok | .quota-bar-warn | .quota-bar-danger
```

### 10.5 Tabs
```
validTabs = ['dashboard', 'reseller', 'playground', 'leaderboard', 'opencode', '9router', 'faq']
```

### 10.6 Reseller Customer Key Row
```
tr
  td: name, keyMasked, tag
  td: usage (total_tokens / maxTokens)
  td: quota-bar
  td: actions (topup, extend, delete, dashboard link)
```

### 10.7 Topup Modal
```
.topup-modal
  countdown timer (topupCountdown)
  Midtrans Snap embed / redirectUrl
```

---

## 11. Rate Limits & Cooldowns

| Action | Cooldown |
|---|---|
| Change PIN | 1 jam |
| Regenerate Key | 1 jam |
| PIN attempts | lock setelah X gagal (`pinLockedUntil`) |
| Topup polling | 5 detik interval |

---

## 12. Quick Test Script (Node.js)

```javascript
const TOKEN = '6589ae919962973d43cde8e8d1275bb2c37b82d27f924a5123fe1e5a84485255';
const PIN = '111111';
const BASE = 'https://bandelbanget.xyz';

async function main() {
  // 1. Verify PIN
  const verifyRes = await fetch(`${BASE}/api/public/quota/${TOKEN}/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: PIN }),
  });
  const { accessToken } = await verifyRes.json();
  console.log('Access Token:', accessToken);

  // 2. Load dashboard data
  const dataRes = await fetch(`${BASE}/api/public/quota/${TOKEN}/data`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await dataRes.json();
  console.log('Dashboard:', data);

  // 3. Load activity
  const actRes = await fetch(`${BASE}/api/public/quota/${TOKEN}/activity`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log('Activity:', await actRes.json());

  // 4. Load model config
  const cfgRes = await fetch(`${BASE}/api/public/quota/${TOKEN}/models-config`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log('Model Config:', await cfgRes.json());
}

main().catch(console.error);
```
