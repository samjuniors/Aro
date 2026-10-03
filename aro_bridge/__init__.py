"""aro_bridge — the aro.jsonl/1 bridge daemon (stdlib-only Python).

``aro_bridge.daemon`` is a JSONL-over-stdio agent daemon: one JSON input per
line on stdin (``user_message`` / ``tool_result`` / ``interrupt``), one JSON
event per line on stdout (``session_start`` … ``done``). The event protocol is
byte-for-byte the same as the sandbox aro-bridge twin's NDJSON surface — only
the carrier differs (stdio instead of HTTP). See ``protocol.md``.
"""
