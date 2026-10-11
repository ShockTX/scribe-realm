// Live smoke check for Scribe Realm. No new deps (node fetch only).
// Reads secrets ONLY from env — never commit credentials here.
//
//   SITE_URL           default https://scribe.atxcuriosities.com
//   BASIC_AUTH_USER / BASIC_AUTH_PASS   (or SCRIBE_AUTH="user:pass")
//
// Checks (no Anthropic credit burn):
//   GET  /            -> 200 + contains Saltmarrow/Scribe
//   GET  /gm/health   -> 200 JSON { ok:true }
//   POST /gm/quest    empty body -> 400 (backend validation, no LLM call)
//   POST /gm/scene    empty body -> 400
//
// Exit codes: 0 all PASS, 1 assertion failure, 2 missing env/auth config.

const SITE = (process.env.SITE_URL || "https://scribe.atxcuriosities.com").replace(/\/$/, "");

function readAuth() {
  let user = process.env.BASIC_AUTH_USER;
  let pass = process.env.BASIC_AUTH_PASS;
  const combo = process.env.SCRIBE_AUTH;
  if ((!user || !pass) && combo) {
    const i = combo.indexOf(":");
    if (i > 0) {
      user = user || combo.slice(0, i);
      pass = pass || combo.slice(i + 1);
    }
  }
  return { user, pass };
}

const { user, pass: authPass } = readAuth();
if (!user || !authPass) {
  console.error("Missing auth: set BASIC_AUTH_USER/BASIC_AUTH_PASS (or SCRIBE_AUTH=user:pass).");
  process.exit(2);
}
const authHeader = "Basic " + Buffer.from(`${user}:${authPass}`).toString("base64");
const H = { Authorization: authHeader };

let failures = 0;
function pass(line) {
  console.log(`PASS: ${line}`);
}
function fail(line, detail = "") {
  failures += 1;
  console.error(`FAIL: ${line}${detail ? " — " + detail : ""}`);
}

async function fetchText(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), ...H },
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text().catch(() => "");
  return { res, text };
}

try {
  // 1. GET /
  {
    const { res, text } = await fetchText(`${SITE}/`, { method: "GET" });
    if (res.status !== 200) fail("GET / returns 200", `got ${res.status}`);
    else if (!/saltmarrow|scribe/i.test(text)) fail("GET / contains Saltmarrow/Scribe", "marker missing");
    else pass("GET / returns 200 + contains Saltmarrow/Scribe");
  }

  // 2. GET /gm/health -> { ok:true }
  {
    const { res, text } = await fetchText(`${SITE}/gm/health`, {
      method: "GET",
      headers: { accept: "application/json" },
    });
    if (res.status !== 200) {
      fail("GET /gm/health returns 200", `got ${res.status}`);
    } else {
      let j = null;
      try {
        j = JSON.parse(text);
      } catch {
        j = null;
      }
      if (j && j.ok === true) pass("GET /gm/health returns ok:true");
      else fail("GET /gm/health returns ok:true", `body=${text.slice(0, 200)}`);
    }
  }

  // 3. POST /gm/quest empty body -> 400 (validation, no LLM credit burn)
  {
    const { res } = await fetchText(`${SITE}/gm/quest`, { method: "POST" });
    if (res.status !== 400) fail("POST /gm/quest empty -> 400", `got ${res.status}`);
    else pass("POST /gm/quest empty -> 400 (no credit burn)");
  }

  // 4. POST /gm/scene empty body -> 400
  {
    const { res } = await fetchText(`${SITE}/gm/scene`, { method: "POST" });
    if (res.status !== 400) fail("POST /gm/scene empty -> 400", `got ${res.status}`);
    else pass("POST /gm/scene empty -> 400 (no credit burn)");
  }
} catch (e) {
  fail("verify harness", String((e && e.message) || e));
}

if (failures) {
  console.error(`${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("All verify checks passed.");
