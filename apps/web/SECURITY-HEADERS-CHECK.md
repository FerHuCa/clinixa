# Security Headers — Manual Verification

After deploying to Railway, run the following command to verify all headers are present:

```bash
curl -sI https://clinixa.mx | grep -iE \
  "strict-transport-security|x-frame-options|x-content-type-options|referrer-policy|content-security-policy|permissions-policy"
```

## Expected output (each line must appear):

```
strict-transport-security: max-age=31536000; includeSubDomains
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=(), payment=()
content-security-policy: default-src 'self'; script-src 'self' ...
```

## Also verify the API:

```bash
curl -sI https://api.clinixa.mx/health
```

The API response should NOT include a `Server` header with version details.
Error responses (e.g. a 500) must return `Content-Type: application/problem+json`
and must NOT contain a stack trace in the body.

## Recommended tool

Use https://securityheaders.com — paste `https://clinixa.mx` for a full grade report.
