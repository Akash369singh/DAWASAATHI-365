# Security & Privacy Architecture — DawaSaathi 365

## 1. Overview
DawaSaathi 365 manages sensitive health schedules, prescription data, and emergency communications for elderly family members. The system implements a defense-in-depth, zero-trust security architecture designed to prevent unauthorized access while maintaining friction-free simplicity for elderly patients.

---

## 2. Authentication & Authorization Model

### Passcode Hashing with Bcrypt
- All authentication is performed using 4-digit passcodes.
- Passcodes are never stored in plaintext; they are hashed using `bcrypt` with work factor 12 (`gensalt(rounds=12)`).
- Profile access uses human-friendly care circle codes (e.g., `CARE-7291`).

### Brute-Force Rate Limiting & Account Lockout
- If 5 consecutive failed login attempts occur on a profile, the account is temporarily locked for 5 minutes (`HTTP 429 Too Many Requests`).
- Successful logins reset the failed attempt counter and log an audit trail entry.

### Role-Based Access Control (RBAC)
Every member has an assigned role with granular capabilities:
| Role | Capabilities | Restrictions |
| :--- | :--- | :--- |
| **ELDER** | 1-Tap Dose Confirmation, Daily Wellbeing Check-in, Emergency SOS, Font/Language Preferences | Can view full care circle; cannot be edited by family without permission |
| **CARETAKER** | Full CRUD on Medications, Schedule Adjustments, Appointment Management, SOS Resolution | Authorized primary responder |
| **FAMILY** | Read-Only Adherence Tracking, Escalation Recipient | Cannot modify medication doses or prescriptions unless explicitly granted `can_edit_meds` by the elder |

---

## 3. Cryptographic Action Tokens (Magic Links)
- Email dose confirmation and SOS acknowledgment use time-bound, HMAC-signed single-use action tokens powered by `itsdangerous.URLSafeTimedSerializer`.
- **Tampering Resistance**: Any alteration of token bytes invalidates the HMAC signature and is rejected with `HTTP 400 Bad Request`.
- **Single-Use Enforcement**: Tokens are recorded in `action_tokens` upon creation and flagged `is_used = True` upon execution. Subsequent attempts are safely rejected.
- **Expiration Enforcement**: Tokens expire after 48 hours.

---

## 4. Network Security & HTTP Headers
The FastAPI backend enforces production-grade security headers on every response:
- `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing attacks.
- `X-Frame-Options: DENY`: Prevents clickjacking and framing of the health interface.
- `X-XSS-Protection: 1; mode=block`: Activates browser cross-site scripting filters.
- `Referrer-Policy: strict-origin-when-cross-origin`: Restricts referrer data leakage.
- `Permissions-Policy: camera=(), microphone=(self), geolocation=(self)`: Restricts browser device APIs.

### CORS Whitelisting
- Wildcard CORS (`*`) with credentials is strictly prohibited.
- Origin requests are verified against exact origins (`localhost:5173`, `localhost:3000`) and the production Vercel deployment regex `^https://[a-zA-Z0-9_-]+\.vercel\.app$`.

---

## 5. Privacy & Zero-Secret Policy
- Client-side code contains zero secrets, database connection strings, or SMTP credentials.
- All configuration is sourced from server environment variables via Pydantic Settings.
- `.env` is permanently excluded via `.gitignore`.
