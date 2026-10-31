# VODEL runtime reliability

Production start: `npm start` (one supervisor, one bot worker). The Windows scheduled task `VODEL Sales Bot` runs `scripts/start_bot.ps1` at user logon. Avoid `npm run dev` for the production WhatsApp session.

The supervisor restarts a terminated worker after five seconds. HTTP or connection startup that remains unhealthy for three minutes triggers a worker restart. It only terminates its own process tree. A loopback lock on port 8889 prevents a second supervisor. WhatsApp logout/QR is an authentication condition, not a restart loop.

The worker checks the actual WhatsApp connection every 20 seconds. Two failed probes trigger reconnect with 5–60 second backoff. Ordinary disconnect and initialization errors also reconnect. A real logout requires QR authentication.

Incoming direct customer messages received during reconnect are queued until READY. Recent, unanswered replay events (at most 15 minutes old, after the first reliability deployment) may be processed. Existing operator takeover, newer consultant replies, outgoing echoes and older history remain excluded. The on-disk inbound ledger retains IDs for 24 hours, including interrupted processing, to avoid uncertain duplicate sends. In-memory queued message objects do not survive a process crash; WhatsApp must redeliver those events. Interrupted processing should be reviewed in logs rather than blindly retried.

Contact and media lookups have timeouts; Gemini attempts use an eight-second network timeout per model and no second full retry chain. Unexpected processing exceptions no longer set human mode permanently. Explicit operator/checkout/service handovers are preserved.

Verification: `node test_safety_suite.js`. The reliability tests execute the actual inbound handler against an isolated adapter, including pre-READY arrivals, replay deduplication, unavailable contacts and outgoing echoes. They send no WhatsApp messages.

Diagnostics: `GET /api/status`, `logs/supervisor.log`, `logs/bot-runtime.log`. Status includes runtime version, queue size, last inbound time, active turns and authentication state.

This is a local Windows service: the computer must remain powered on, awake and online. Startup at login is not a cloud deployment. Provider outages and WhatsApp authentication still require recovery time; zero downtime is not guaranteed.
