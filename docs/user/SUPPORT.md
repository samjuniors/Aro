# Aro Support & Community Instructions

Thank you for testing the Aro Beta! Here is how to get help, report issues, and interact with the maintainers.

---

## 1. Where to Get Help
- **GitHub Discussions**: For general questions, setup discussions, feature requests, and community assistance:
  👉 [github.com/samjuniors/SamAgent/discussions](https://github.com/samjuniors/SamAgent/discussions)
- **GitHub Issues**: For bug reports, reproducible crashes, and security notifications:
  👉 [github.com/samjuniors/SamAgent/issues](https://github.com/samjuniors/SamAgent/issues)

---

## 2. Filing a High-Quality Bug Report
When filing a bug on GitHub Issues, please include:
1. **Aro Version**: Open **Settings → Updates & About** and copy the Version and Commit hash (e.g. `v0.1.0-beta.1 (660df25)`).
2. **Operating System**: Windows 11, macOS Sequoia, Ubuntu 24.04, etc.
3. **Reproduction Steps**: Concise step-by-step actions that trigger the defect.
4. **Expected vs Actual Behavior**: What you expected to see vs what occurred.
5. **Logs / Diagnostics**: Run `hermes logs` or export a sanitized session trace.

---

## 3. Exporting Sanitized Diagnostics
If an issue involves backend execution or process failures:
1. Open the terminal or command palette.
2. Run:
   ```bash
   hermes sessions export --redact
   ```
3. This creates a sanitized JSONL trace where all API keys, session tokens, and secrets are replaced with `<redacted>`.
4. Attach the sanitized file to your issue.
