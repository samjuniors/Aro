# Aro Privacy Policy & Terms of Service (Draft)

**Last updated**: October 21, 2026

## 1. Our Commitment: Local-First & Zero Telemetry
Aro is designed as a developer tool that respects your privacy and proprietary code. We operate on a strict **Zero Outbound Telemetry** principle (ADR 0012).

### What We DO NOT Collect:
- **No telemetry**: We do not collect product analytics, clickstream data, engagement metrics, or screen recordings.
- **No usage pings**: Opening, using, or closing Aro sends zero tracking packets across the network.
- **No background crash uploads**: Crashes write logs to your local device only.

---

## 2. Where Data Goes
When you use Aro, your data only leaves your machine when you explicitly configure an external network service:
1. **Model API Calls**: When you send prompts to a cloud AI model (such as OpenAI, Anthropic, or Google Gemini), your prompt and file context are sent directly to that provider using the API credentials you provided. Aro operates as a direct client and does not proxy or intermediate your model requests.
2. **Web Search & Fetch**: When you or the agent performs a web search or browses a website, queries are sent directly to the search provider or target web server.
3. **Software Updates**: When update checking is enabled, Aro checks for release manifests on our distribution repository. Only version metadata is retrieved; no user identifiers are sent.

---

## 3. Data Storage & Security
- All conversations, subagent work-graphs, settings, and memory are stored locally in your user profile directory (`~/.aro`).
- Secrets and API keys are stored in a local environment file (`~/.aro/.env`) protected with operating system file permissions.
- You can clear all local data at any time by deleting the `~/.aro` folder.

---

## 4. Diagnostics & Support
If you encounter a defect and wish to file an issue:
- You may export an encrypted diagnostics bundle manually.
- All secrets, API keys, and session tokens are redacted automatically before the bundle is created on disk.
- You have full inspection capability over any diagnostic file before deciding to share it with our support team.
