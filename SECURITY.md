# Security scope

The Node app is a loopback-only synthetic-data prototype. The Cloudflare build
supports a public synthetic demo with isolated, expiring browser sessions; it has
no patient accounts or real-record ingestion and is not suitable for real patient
data. Do not expose the shared Node API directly as the public demo.

Keep GBrain tokens in server-side secret settings and use a dedicated demo
connection. Hosted GBrain permission enforcement remains unverified. Do not publish
tokens, raw local stores, or private records in issues. Report security concerns
privately to the repository maintainer through an available private channel; this
project does not provide a dedicated security response service. Rotate any
accidentally disclosed connection token and remove it from affected history.
