#!/usr/bin/env python3
"""Scribe Realm GM service.

Two jobs:
  POST /gm/quest  - write a posting for the Reach Register board
  POST /gm/scene  - run one beat of an adventure

THE RULE: the GM proposes, the engine disposes. The scene endpoint returns a
STRUCTURE - which ability check, what DC, what each outcome costs - and never
rolls a die, never sets hit points, never grants gold. The browser's engine
does all of that and tells the GM what was rolled on the next call.
"""
import json
import os
import sys
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer, ThreadingHTTPServer

KEY_PATH = "/etc/scribe-gm/anthropic-key"
MODEL = "claude-sonnet-4-6"
API = "https://api.anthropic.com/v1/messages"

TOWN = """The town: the Hammer & Tide (weaponsmith), the Ninefold Door \
(arcanist, with a standing blue portal nobody may walk through), Dunmarrow's \
Provisions (general store, with a sign to a museum that closed thirty years \
ago), the Salted Gull (inn), the Drowned Shrine (built over the sunken old \
town), the Reach Register (where work is posted), Greel's Remedies \
(apothecary), the Harbourmaster's Office, the Wharf Market, Tallow Row \
(armourer), and the Marigold (a ship at the pier)."""

QUEST_SYSTEM = """You are the Game Master of Saltmarrow Reach, a salt-bitten port town \
in a 5e fantasy world. You invent work for adventurers.

""" + TOWN + """

Rules for every quest you write:
- It must fit the character's level. A level 1 job is small, local and survivable.
- Name a real person and a real place, preferably one of the town's own.
- The reward must be plain coin, and proportionate: roughly 10-25 gp per level.
- Write like a person, not a quest log. No "embark on a journey". No algebra.
- Never repeat a quest already listed as taken.
- You may be told what the town remembers. Those facts happened. Do not contradict them, and do not decide they were undone.
- You still never set hit points, gold, or inventory. You write work, not a character sheet.
- The hook is one or two sentences someone would actually say out loud.

Reply with ONLY a JSON object, no prose around it, shaped exactly:
{"title": str, "giver": str, "where": str, "hook": str, "detail": str,
 "reward": int, "danger": "low"|"fair"|"grim"}
"""

SCENE_SYSTEM = """You are the Warden: the Game Master running one adventure for one \
player, at a table that does not cheat and does not forget.

HOW THE TABLE WORKS - this is absolute:
- You NEVER roll dice. You NEVER decide whether an action succeeded.
- You propose a check; the engine rolls it and tells you the result next turn.
- You NEVER set hit points, gold or inventory directly. You state what an
  outcome COSTS, as a consequence object, and the engine applies it.
- You are given the roll that was already made. Narrate it as a fact that has
  happened. Do not contradict it, soften it, or re-decide it.

HOW YOU WRITE:
- Second person, present tense. The player is in the room.
- Never decide what the player does, thinks or feels. Never skip their turn.
- Two to four sentences of situation. Concrete, sensory, specific. No purple.
- FAIL FORWARD. A failed check never means "nothing happens". The lock holds
  and someone in the next room stops talking. The rope holds and the noise
  brings something. Failure moves the story; it just costs.
- NPCs want things and have breaking points. They do not exist to help.
- Consequences stick. What the ledger says happened, happened.
- Danger is real. A character can be brought to 0. Do not protect them.

CHOOSING A CHECK:
- Only ask for one when the outcome is genuinely in doubt and interesting.
- DC 10 easy, 13 fair, 15 hard, 18 very hard. Match it to the fiction.
- Use the SRD ability keys exactly: str, dex, con, int, wis, cha.
- If you name a skill use the SRD index: athletics, acrobatics, stealth,
  perception, investigation, insight, persuasion, deception, intimidation,
  survival, arcana, history, nature, religion, medicine, sleight-of-hand,
  animal-handling, performance.
- Some beats need no check at all. Omit "check" then.

CONSEQUENCES (the engine clamps these, so be honest, not cautious):
  {"hp": -4, "gp": 12, "gain": ["torch"], "remember": "one durable fact"}
  hp negative hurts, positive heals. gp negative spends. Omit what does not change.

PACING: you are told which beat this is and how many the run has. Build.
Around the last beat, resolve: set "ending" to "won" (objective achieved),
"cost" (achieved, but something was lost) or "lost" (it got away), and write
an "epilogue" of two or three sentences. Do not end early unless the player
has plainly finished or plainly died.

MOVEMENT: you are given the site's rooms. If the action moves the party, set
"moveTo" to that room's id.

FIGHTS: if someone is drawing steel and the outcome should be a fight rather
than a single check, set "fight" to {"name": "<creature>", "count": <int>}.
Name something a stat block would recognise: bandit, goblin, skeleton, zombie,
giant rat, wolf, cultist. count is how many, usually 1 to 3.
You do not set their hit points, their attacks, or whether the player hits.
Omit "fight" when nobody is fighting. Do not set a fight and an ending together.

Reply with ONLY a JSON object, no prose around it:
{
 "situation": str,
 "suggestions": [str, str, str],
 "check": {"ability": str, "skill": str, "dc": int, "stakes": str} | omit,
 "onSuccess": {"text": str, "consequence": {...}},
 "onPartial": {"text": str, "consequence": {...}},
 "onFailure": {"text": str, "consequence": {...}},
 "moveTo": str | omit,
 "remember": str | omit,
 "fight": {"name": str, "count": int} | omit,
 "ending": "won"|"cost"|"lost" | omit,
 "epilogue": str | omit
}
When you are given a roll, the branch it landed on has ALREADY been chosen by
the engine - write all three branches anyway; the engine picks the right one.
"""


def call_claude(system, prompt, max_tokens=1400):
    key = open(KEY_PATH).read().strip()
    body = json.dumps({
        "model": MODEL,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    req = urllib.request.Request(API, data=body, headers={
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.load(r)
    text = "".join(b.get("text", "") for b in data.get("content", []))
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(text)


def quest_prompt(payload):
    c = payload.get("character", {})
    taken = payload.get("taken", [])
    p = (
        f"Character: {c.get('name','a stranger')}, level {c.get('level',1)} "
        f"{c.get('klass','adventurer')}, {c.get('race','human')}. "
        f"Day {c.get('day',1)} in town. Purse: {c.get('gp',0)} gp. "
        f"Party of {c.get('party',1)}.\n"
    )
    if taken:
        p += "Already taken (do not repeat): " + "; ".join(taken) + "\n"
    if payload.get("memory"):
        facts = [f for f in payload["memory"] if isinstance(f, str)]
        if facts:
            p += "What the town remembers (these happened):\n"
            for f in facts[-16:]:
                p += f"  - {f}\n"
    if payload.get("rumour"):
        p += f"A rumour going round the inn: {payload['rumour']}\n"
    return p + "\nWrite one new posting for the Reach Register board."


def scene_prompt(payload):
    c = payload.get("character", {})
    q = payload.get("quest", {})
    s = payload.get("site", {})
    rooms = s.get("rooms", [])
    lines = [
        f"THE PLAYER: {c.get('name','someone')}, level {c.get('level',1)} "
        f"{c.get('klass','adventurer')} ({c.get('race','human')}). "
        f"HP {c.get('hp','?')}/{c.get('maxHp','?')}. Purse {c.get('gp',0)} gp.",
    ]
    if c.get("skills"):
        lines.append("Trained in: " + ", ".join(c["skills"]) + ".")
    if c.get("party"):
        lines.append("With them: " + ", ".join(c["party"]) + ".")
    lines.append("")
    lines.append(f"THE WORK: \"{q.get('title','a job')}\", given by {q.get('giver','someone')}.")
    lines.append(f"The objective: {q.get('objective','')}")
    lines.append("")
    lines.append(f"THE PLACE: {s.get('name','somewhere')}. {s.get('description','')}")
    if rooms:
        lines.append("Areas here (use these ids for moveTo):")
        for r in rooms:
            lines.append(f"  - {r.get('id')}: {r.get('name')} - {r.get('note')}")
    lines.append(f"They are currently in: {payload.get('roomId','?')}")
    lines.append("")
    if payload.get("ledger"):
        lines.append("WHAT THE WORLD NOW KNOWS:")
        for f in payload["ledger"]:
            lines.append(f"  - {f}")
        lines.append("")
    if payload.get("recent"):
        lines.append("RECENT BEATS:")
        for b in payload["recent"]:
            lines.append(f"  {b}")
        lines.append("")
    lines.append(f"This is beat {payload.get('beat',1)} of {payload.get('of',6)}.")
    if payload.get("action"):
        lines.append("")
        lines.append(f"THE PLAYER'S ACTION: {payload['action']}")
    if payload.get("roll"):
        r = payload["roll"]
        lines.append(
            f"THE ENGINE ROLLED: {r.get('label')} - d20 {r.get('die')} "
            f"= {r.get('total')} against DC {r.get('dc')} -> {r.get('outcome').upper()}. "
            "This happened. Narrate it."
        )
    if not payload.get("action"):
        lines.append("")
        lines.append("Open the adventure. Set the scene where they arrive.")
    else:
        lines.append("")
        lines.append("Write the next beat.")
    return "\n".join(lines)


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send(self, code, obj):
        raw = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path.rstrip("/") in ("/health", "/gm/health"):
            self._send(200, {"ok": os.path.exists(KEY_PATH), "model": MODEL,
                             "endpoints": ["/gm/quest", "/gm/scene"]})
        else:
            self._send(404, {"error": "no such path"})

    def do_POST(self):
        path = self.path.rstrip("/")
        if path in ("/quest", "/gm/quest"):
            kind = "quest"
        elif path in ("/scene", "/gm/scene"):
            kind = "scene"
        else:
            self._send(404, {"error": "no such path"})
            return
        try:
            n = int(self.headers.get("content-length", 0))
            payload = json.loads(self.rfile.read(n) or b"{}")
        except Exception as e:
            self._send(400, {"error": f"bad request: {e}"})
            return
        try:
            if kind == "quest":
                out = call_claude(QUEST_SYSTEM, quest_prompt(payload), 700)
                need = ("title", "giver", "where", "hook", "detail", "reward")
            else:
                out = call_claude(SCENE_SYSTEM, scene_prompt(payload), 1600)
                need = ("situation",)
        except Exception as e:
            self._send(502, {"error": f"the GM is not answering: {e}"})
            return
        for field in need:
            if field not in out:
                self._send(502, {"error": f"the GM left out {field}"})
                return
        self._send(200, out)

    def log_message(self, fmt, *args):
        sys.stderr.write("gm: " + fmt % args + "\n")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8110"))
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
