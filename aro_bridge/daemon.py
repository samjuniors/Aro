"""aro_bridge.daemon — the aro.jsonl/1 bridge daemon (stdlib only).

JSONL over stdio: one JSON input per line on stdin (``user_message`` /
``tool_result`` / ``interrupt``), one JSON event per line on stdout
(``session_start`` … ``done``, flushed after every line). The event protocol,
the system prompt, and the JSON tool-call parsing mirror the sandbox
aro-bridge twin (mini-services/aro-bridge/index.ts) exactly; only the carrier
differs — stdio owned by Electron main instead of NDJSON HTTP.

Engines:
  demo   — deterministic, no network: a canned think → search → compose →
           stream sequence per turn (wiring tests + UI without an endpoint).
  openai — the real loop against an OpenAI-compatible ``/chat/completions``
           endpoint (the Aro api_server). Tools execute in the HOST: after a
           tool_call the daemon blocks on the next stdin line, which must be
           the call's tool_result (fed back as ``TOOL_RESULT …``) or an
           interrupt (aborts the turn).

Stdin is drained by a background thread into a queue so an ``interrupt``
lands even while the main loop is between model steps; EOF anywhere exits 0.
"""

from __future__ import annotations

import argparse
import json
import queue
import random
import re
import sys
import threading
import time
import urllib.error
import urllib.request

PROTOCOL = "aro.jsonl/1"
TOOL_NAMES = ("web_search", "page_reader")
MAX_ROUNDS = 7
DEFAULT_BASE_URL = "http://localhost:8642/v1"
DEFAULT_MODEL = "aro-4-70b"
HTTP_TIMEOUT_S = 120

_B36 = "0123456789abcdefghijklmnopqrstuvwxyz"


class Interrupted(Exception):
    """An interrupt arrived mid-turn (the twin's aborted AbortSignal)."""


class StdinClosed(Exception):
    """EOF while a turn was still in flight — exit cleanly."""


def _to_base36(value: int) -> str:
    digits = ""
    while value:
        value, rem = divmod(value, 36)
        digits = _B36[rem] + digits
    return digits or "0"


def _nid(prefix: str) -> str:
    """`<p>_<base36 time><random>` — the twin's nid()."""
    return f"{prefix}_{_to_base36(int(time.time() * 1000))}{''.join(random.choices(_B36, k=5))}"


def _warn(message: str) -> None:
    print(f"[aro-bridge] {message}", file=sys.stderr, flush=True)


def _emit(event: dict) -> None:
    sys.stdout.write(json.dumps(event, separators=(",", ":"), ensure_ascii=False) + "\n")
    sys.stdout.flush()


def system_prompt(max_tool_calls: int) -> str:
    """Verbatim from the twin (the tool budget is the configured dial)."""
    return (
        "You are Aro — the agent behind the Aro Workbench, connected through the aro bridge with real tools.\n"
        "\n"
        "TOOL PROTOCOL — you have no native function calling. When a tool would genuinely help, reply with ONLY this JSON object (no prose, no code fences, nothing else):\n"
        '{"tool":"web_search","args":{"query":"...","num":5}}\n'
        '{"tool":"page_reader","args":{"url":"https://..."}}\n'
        "The bridge executes it and sends the result back as the next user message beginning with TOOL_RESULT. "
        f"At most {max_tool_calls} tool calls per turn — do not search for things you already know; do not re-read a page you just searched.\n"
        "\n"
        "When you have enough to answer (or no tool helps), reply with plain text only — it streams straight to the user. "
        "Be terse and direct, under 120 words, plain claims over adjectives. Never mention the tool protocol, JSON, bridges, or that you are a model."
    )


def parse_tool_call(content: str) -> dict | None:
    """Identical to the twin's parseToolCall: bare or fenced JSON, first { … last }
    span, tool name validated against the roster; None when it is plain prose."""
    text = content.strip()
    if not text.startswith("{") and not text.startswith("```"):
        return None
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    candidate = (fenced.group(1) if fenced else text).strip()
    span = re.search(r"\{[\s\S]*\}", candidate)
    if span is None:
        return None
    try:
        obj = json.loads(span.group(0))
    except (json.JSONDecodeError, ValueError):
        return None
    if not isinstance(obj, dict):
        return None
    tool = obj.get("tool")
    if not isinstance(tool, str) or tool not in TOOL_NAMES:
        return None
    args = obj.get("args")
    if not isinstance(args, dict):
        args = {}
    return {"tool": tool, "args": args}


def _clip(text: str, max_chars: int) -> str:
    return text if len(text) <= max_chars else f"{text[: max_chars - 1]}…"


class Daemon:
    def __init__(self, engine: str, base_url: str, model: str, api_key: str, max_tool_calls: int) -> None:
        self.engine = engine
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.max_tool_calls = max_tool_calls
        self.session_id = _nid("as")
        self.history: list[dict[str, str]] = []
        self.inputs: "queue.Queue[str | None]" = queue.Queue()
        self.in_flight = False
        self.eof = False

    # ---------------- stdin plumbing ----------------

    def _read_stdin(self) -> None:
        """Background thread: every stdin line onto the queue; None on EOF."""
        try:
            for line in sys.stdin:
                line = line.strip()
                if line:
                    self.inputs.put(line)
        except ValueError:
            # stdin closed underneath us (e.g. the host dropped the pipe).
            pass
        self.inputs.put(None)

    def _check_interrupt(self) -> None:
        """Drain pending inputs for an interrupt (mid-turn poll; anything else
        that arrives uninvited is warned about and dropped). stdin EOF only
        latches `eof` — the in-flight turn finishes before the daemon exits
        cleanly — so a piped one-shot run still streams its full sequence."""
        while True:
            try:
                item = self.inputs.get_nowait()
            except queue.Empty:
                return
            if item is None:
                self.eof = True
                return
            try:
                msg = json.loads(item)
            except (json.JSONDecodeError, ValueError):
                _warn(f"ignoring non-JSON stdin line: {_clip(item, 80)}")
                continue
            kind = msg.get("type")
            if kind == "interrupt":
                raise Interrupted()
            _warn(f"ignoring {kind!r} input mid-turn (only interrupt is valid here)")

    def _await_tool_result(self, call_id: str) -> dict:
        """Block for the host's tool_result (or interrupt) — the delegated-tools
        handshake. The next stdin line decides the turn."""
        while True:
            item = self.inputs.get()
            if item is None:
                raise StdinClosed()
            try:
                msg = json.loads(item)
            except (json.JSONDecodeError, ValueError):
                _warn(f"ignoring non-JSON stdin line: {_clip(item, 80)}")
                continue
            kind = msg.get("type")
            if kind == "interrupt":
                raise Interrupted()
            if kind == "tool_result":
                call_id_in = msg.get("callId")
                if call_id_in != call_id:
                    _warn(f"tool_result for {call_id_in!r} does not match pending call {call_id!r}")
                return msg
            _warn(f"ignoring {kind!r} input while a tool_result is pending")

    # ---------------- engines ----------------

    def run_turn(self, user_text: str) -> None:
        started = time.monotonic()
        self.history.append({"role": "user", "content": user_text})
        tool_calls = 0
        try:
            if self.engine == "demo":
                tool_calls = self._run_demo_turn(user_text)
            else:
                tool_calls = self._run_openai_turn()
        except Interrupted:
            _emit({"type": "error", "message": "interrupted"})
            _emit({"type": "done", "ms": _ms_since(started), "toolCalls": tool_calls})
            return
        except StdinClosed:
            raise
        except Exception as error:  # noqa: BLE001 — the protocol turns every failure into error+done
            message = str(error) or error.__class__.__name__
            _emit({"type": "error", "message": _clip(message, 300)})
            _emit({"type": "done", "ms": _ms_since(started), "toolCalls": tool_calls})
            return
        _emit({"type": "done", "ms": _ms_since(started), "toolCalls": tool_calls})

    def _run_demo_turn(self, user_text: str) -> int:
        """Deterministic think → search → compose → stream, no network."""
        t0 = time.monotonic()
        time.sleep(0.6)
        self._check_interrupt()
        _emit({"type": "thinking", "label": "Considering the request", "ms": _ms_since(t0)})

        query = user_text[:60]
        call_id = _nid("tc")
        _emit({"type": "tool_call", "callId": call_id, "tool": "web_search", "args": {"query": query}})

        t1 = time.monotonic()
        time.sleep(0.8)
        self._check_interrupt()
        lines = [
            "1. aro.dev — Aro Workbench: the agent workbench this bridge serves",
            "2. aro.dev/docs — Aro agent docs: tools, sessions, checkpoints",
            "3. aro.dev/blog — Aro engineering notes: bridges and protocols",
        ]
        _emit(
            {
                "type": "tool_result",
                "callId": call_id,
                "ok": True,
                "ms": _ms_since(t1),
                "summary": f"3 results for “{query}”",
                "lines": lines,
            }
        )

        t2 = time.monotonic()
        time.sleep(0.3)
        self._check_interrupt()
        _emit({"type": "thinking", "label": "Composing reply", "ms": _ms_since(t2)})

        reply = (
            f"Demo engine: no endpoint configured. Ask came through as "
            f'"{_clip(user_text, 40)}…". Run with --engine openai against the '
            f"Aro api_server for real answers."
        )
        t3 = time.monotonic()
        self._stream_deltas(reply)
        _emit({"type": "reply_done", "ms": _ms_since(t3)})
        return 1

    def _run_openai_turn(self) -> int:
        """The twin's runAgent loop, against an OpenAI-compatible endpoint,
        with tools delegated to the host."""
        convo: list[dict[str, str]] = [{"role": "system", "content": system_prompt(self.max_tool_calls)}]
        convo.extend(self.history[-12:])
        tool_calls = 0

        for round_index in range(MAX_ROUNDS):
            t0 = time.monotonic()
            content = self._chat_completion(convo)
            if not content:
                raise RuntimeError("empty model reply")
            ms = _ms_since(t0)

            call = parse_tool_call(content) if tool_calls < self.max_tool_calls else None
            if call is None:
                _emit({"type": "thinking", "label": "Composing reply", "ms": ms})
                t1 = time.monotonic()
                self._stream_deltas(content)
                _emit({"type": "reply_done", "ms": _ms_since(t1)})
                self.history.append({"role": "assistant", "content": content})
                return tool_calls

            _emit(
                {
                    "type": "thinking",
                    "label": "Considering the request" if round_index == 0 else "Reviewing results",
                    "ms": ms,
                }
            )
            tool_calls += 1
            call_id = _nid("tc")
            _emit({"type": "tool_call", "callId": call_id, "tool": call["tool"], "args": call["args"]})

            # Tools execute in the host: block for the result (or an interrupt).
            t1 = time.monotonic()
            result = self._await_tool_result(call_id)
            ok = bool(result.get("ok"))
            output = str(result.get("output") or "")
            out_lines = [line for line in output.split("\n") if line.strip()] or [output]
            summary = _clip(out_lines[0].strip() or ("tool failed" if not ok else "no output"), 80)
            _emit(
                {
                    "type": "tool_result",
                    "callId": call_id,
                    "ok": ok,
                    "ms": _ms_since(t1),
                    "summary": summary,
                    "lines": out_lines[:60],
                }
            )

            convo.append({"role": "assistant", "content": content})
            convo.append({"role": "user", "content": f"TOOL_RESULT {output[:6000]}"})
        raise RuntimeError("tool budget exhausted")

    def _chat_completion(self, convo: list[dict[str, str]]) -> str:
        body = json.dumps({"model": self.model, "messages": convo, "max_tokens": 700, "temperature": 0.4}).encode(
            "utf-8"
        )
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        request = urllib.request.Request(
            f"{self.base_url}/chat/completions", data=body, headers=headers, method="POST"
        )
        try:
            with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_S) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            detail = error.read(4096).decode("utf-8", "replace").strip() if error.fp else ""
            suffix = f": {detail}" if detail else ""
            raise RuntimeError(f"HTTP {error.code} from {self.base_url}/chat/completions{suffix}") from error
        except urllib.error.URLError as error:
            raise RuntimeError(f"cannot reach {self.base_url}: {error.reason}") from error
        except (json.JSONDecodeError, ValueError) as error:
            raise RuntimeError("invalid JSON from chat completions") from error
        try:
            return str(payload["choices"][0]["message"]["content"] or "").strip()
        except (KeyError, IndexError, TypeError) as error:
            raise RuntimeError("malformed chat completions reply") from error

    def _stream_deltas(self, text: str) -> None:
        """~2 words per delta, ~20ms apart — the twin's chunking."""
        words = re.split(r"(\s+)", text)
        buffer = ""
        for index, word in enumerate(words):
            buffer += word
            if index % 2 == 1 or index == len(words) - 1:
                if buffer:
                    _emit({"type": "assistant_delta", "text": buffer})
                buffer = ""
                time.sleep(0.02)
                self._check_interrupt()

    # ---------------- lifecycle ----------------

    def serve(self) -> int:
        sys.stdout.reconfigure(encoding="utf-8", newline="\n")  # type: ignore[union-attr]
        sys.stdin.reconfigure(encoding="utf-8")  # type: ignore[union-attr]

        reader = threading.Thread(target=self._read_stdin, daemon=True)
        reader.start()

        _emit(
            {
                "type": "session_start",
                "sessionId": self.session_id,
                "model": self.model,
                "tools": list(TOOL_NAMES),
            }
        )

        while True:
            item = self.inputs.get()
            if item is None:
                return 0  # stdin EOF — clean exit
            try:
                msg = json.loads(item)
            except (json.JSONDecodeError, ValueError):
                _warn(f"ignoring non-JSON stdin line: {_clip(item, 80)}")
                continue
            if not isinstance(msg, dict):
                _warn(f"ignoring non-object stdin line: {_clip(item, 80)}")
                continue

            kind = msg.get("type")
            if kind == "user_message":
                text = str(msg.get("text") or "")
                if not text.strip():
                    _warn("ignoring user_message with empty text")
                    continue
                self.in_flight = True
                try:
                    self.run_turn(text)
                except StdinClosed:
                    return 0
                finally:
                    self.in_flight = False
                if self.eof:
                    return 0  # EOF raced the turn — its `done` flushed, now exit
            elif kind == "interrupt":
                if self.in_flight:
                    _warn("interrupt raced the turn boundary — the turn already finished")
                else:
                    _warn("interrupt while idle — ignored")
            elif kind == "tool_result":
                _warn("tool_result with no tool call pending — ignored")
            else:
                _warn(f"unknown input type {kind!r} — ignored")


def _ms_since(started: float) -> int:
    return int((time.monotonic() - started) * 1000)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="aro_bridge.daemon", description=f"The aro bridge daemon (protocol {PROTOCOL})."
    )
    parser.add_argument("--engine", choices=("demo", "openai"), default="demo", help="demo (default) or openai")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="OpenAI-compatible API base URL")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="model name for the openai engine")
    parser.add_argument("--api-key", default="", help="bearer token for the openai engine")
    parser.add_argument("--max-tool-calls", type=int, default=3, help="tool calls allowed per turn")
    args = parser.parse_args(argv)

    daemon = Daemon(
        engine=args.engine,
        base_url=args.base_url,
        model=args.model,
        api_key=args.api_key,
        max_tool_calls=max(0, args.max_tool_calls),
    )
    return daemon.serve()


if __name__ == "__main__":
    sys.exit(main())
