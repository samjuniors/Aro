"""aro_bridge.daemon (demo engine) end-to-end contract over JSONL stdio.

Spawns the daemon the way Electron main will (``python -m aro_bridge.daemon
--engine demo``, cwd=repo root, ``PYTHONPATH=.``) and pins the wire behavior:

- every stdout line is JSON (``aro.jsonl/1`` — no stray prints on stdout);
- ``session_start`` is always first, ``done`` always last;
- a full demo turn streams the ordered think → search → compose → reply
  sequence with matching callIds and the canned reply text;
- a user_message + interrupt combo aborts the turn (``error "interrupted"``
  then ``done``) and exits cleanly;
- unknown input types warn on stderr and are ignored; an idle interrupt is
  ignored; stdin EOF exits 0.

Pytest-style, but directly runnable: ``python3 tests/aro_bridge/test_daemon_demo.py``.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
# The interpreter that runs the tests (venv-aware), matching how Electron main
# will spawn the checkout's own interpreter rather than a PATH python.
PYTHON = os.environ.get("ARO_TEST_PYTHON") or sys.executable
DAEMON_ARGS = [PYTHON, "-m", "aro_bridge.daemon", "--engine", "demo"]
DAEMON_ENV = {**os.environ, "PYTHONPATH": ".", "PYTHONUTF8": "1"}
DAEMON_TIMEOUT_S = 60

EXPECTED_FULL_SEQUENCE = [
    "session_start",
    "thinking",
    "tool_call",
    "tool_result",
    "thinking",
    "assistant_delta",  # …repeated, ~2 words per chunk
    "reply_done",
    "done",
]


def run_daemon(lines: list[str]) -> tuple[list[dict], str, int]:
    """Run the demo daemon with the given stdin lines; return (events, stderr, code)."""
    proc = subprocess.run(
        DAEMON_ARGS,
        input="".join(f"{line}\n" for line in lines),
        capture_output=True,
        text=True,
        encoding="utf-8",
        cwd=REPO_ROOT,
        env=DAEMON_ENV,
        timeout=DAEMON_TIMEOUT_S,
    )
    events = [json.loads(line) for line in proc.stdout.splitlines() if line.strip()]
    return events, proc.stderr, proc.returncode


def expected_types(events: list[dict]) -> list[str]:
    """The sequence with repeated assistant_delta collapsed to one entry."""
    types = [event["type"] for event in events]
    collapsed: list[str] = []
    for event_type in types:
        if event_type == "assistant_delta" and collapsed and collapsed[-1] == "assistant_delta":
            continue
        collapsed.append(event_type)
    return collapsed


def test_full_demo_turn_sequence() -> None:
    events, _stderr, code = run_daemon(['{"type":"user_message","text":"hello bridge"}'])

    # stdout only contains JSON lines (json.loads above would have raised).
    assert code == 0, "stdin EOF must exit 0"

    # First event: session_start, with the wire contract's fields.
    assert events[0]["type"] == "session_start"
    assert events[0]["sessionId"].startswith("as_"), "session ids are as_<base36 time><random>"
    assert events[0]["model"] == "aro-4-70b"
    assert events[0]["tools"] == ["web_search", "page_reader"]

    # Ordered sequence (deltas collapsed): think → search → think → stream → done.
    assert expected_types(events) == EXPECTED_FULL_SEQUENCE, [e["type"] for e in events]
    assert events[-1]["type"] == "done", "done is always last"

    thinking_labels = [e["label"] for e in events if e["type"] == "thinking"]
    assert thinking_labels == ["Considering the request", "Composing reply"]

    # The search call carries the first 60 chars of the ask; its result pairs on callId.
    tool_call = next(e for e in events if e["type"] == "tool_call")
    assert tool_call["tool"] == "web_search"
    assert tool_call["args"] == {"query": "hello bridge"}
    tool_result = next(e for e in events if e["type"] == "tool_result")
    assert tool_result["callId"] == tool_call["callId"]
    assert tool_result["ok"] is True
    assert len(tool_result["lines"]) == 3
    assert tool_result["lines"][0].startswith("1. aro.dev — ")

    # Deltas accumulate into the canned reply.
    reply = "".join(e["text"] for e in events if e["type"] == "assistant_delta")
    assert reply.startswith("Demo engine: no endpoint configured.")
    assert '"hello bridge…"' in reply
    assert "--engine openai" in reply

    # done closes the turn with the tool count.
    done = events[-1]
    assert done["toolCalls"] == 1
    assert done["ms"] >= 1500, "the turn includes the real thinking/tool sleeps"


def test_user_message_then_interrupt_aborts_turn() -> None:
    """The wiring-verification combo: a user_message immediately followed by an
    interrupt skips the remaining steps — error "interrupted", then done."""
    events, stderr, code = run_daemon(
        ['{"type":"user_message","text":"hello bridge"}', '{"type":"interrupt"}']
    )

    assert code == 0
    types = [e["type"] for e in events]
    assert types == ["session_start", "error", "done"], types
    assert events[-1]["type"] == "done", "done is last even after error"
    assert events[1]["message"] == "interrupted"
    assert events[-1]["toolCalls"] == 0
    assert "ignored" not in stderr or "while idle" in stderr  # it was NOT idle


def test_unknown_type_and_idle_interrupt_are_ignored() -> None:
    events, stderr, code = run_daemon(['{"type":"bogus"}', '{"type":"interrupt"}'])

    assert code == 0
    # Nothing ran: stdout carries only the session_start line.
    assert [e["type"] for e in events] == ["session_start"]
    assert "unknown input type 'bogus'" in stderr
    assert "interrupt while idle — ignored" in stderr


def test_openai_engine_reports_unreachable_endpoint() -> None:
    """The openai engine turns a dead endpoint into error + done (never a crash)."""
    proc = subprocess.run(
        [
            PYTHON,
            "-m",
            "aro_bridge.daemon",
            "--engine",
            "openai",
            "--base-url",
            "http://127.0.0.1:1/v1",
        ],
        input='{"type":"user_message","text":"hi"}\n',
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
        env=DAEMON_ENV,
        timeout=DAEMON_TIMEOUT_S,
    )
    events = [json.loads(line) for line in proc.stdout.splitlines() if line.strip()]

    assert proc.returncode == 0
    assert [e["type"] for e in events] == ["session_start", "error", "done"]
    assert "cannot reach" in events[1]["message"]


def main() -> int:
    tests = [
        test_full_demo_turn_sequence,
        test_user_message_then_interrupt_aborts_turn,
        test_unknown_type_and_idle_interrupt_are_ignored,
        test_openai_engine_reports_unreachable_endpoint,
    ]
    started = time.monotonic()
    for test in tests:
        test()
        print(f"PASS {test.__name__}")
    print(f"aro_bridge demo daemon: {len(tests)} tests passed in {time.monotonic() - started:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
