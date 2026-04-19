/** HttpOnly cookie set after super admin passes second factor; used for 15m absolute timeout. */
export const SA_SESSION_COOKIE = "sa_session_started";
export const SA_SESSION_MAX_MS = 15 * 60 * 1000;

/** Set after password OK, before MFA; middleware uses this to route to the second step (not session-end). */
export const SA_MFA_PENDING_COOKIE = "sa_mfa_pending";
export const SA_MFA_PENDING_MAX_AGE_SEC = 10 * 60;
