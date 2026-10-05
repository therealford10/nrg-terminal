require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// The password exists only on the server, never in public JS/HTML.
const ARG_PASSWORD = process.env.ARG_PASSWORD || "";
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

if (!ARG_PASSWORD) {
  console.warn("WARNING: ARG_PASSWORD is not set. Copy .env.example to .env and set it.");
}

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}

function makeToken() {
  const payload = Buffer.from(JSON.stringify({
    ok: true,
    issued: Date.now()
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function validToken(token) {
  if (!token || !token.includes(".")) return false;
  const [payload, signature] = token.split(".");
  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

app.post("/api/login", (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  // Keep the real password on the server.
  const valid = username.toLowerCase() === "system" &&
                ARG_PASSWORD.length > 0 &&
                crypto.timingSafeEqual(
                  Buffer.from(password),
                  Buffer.from(ARG_PASSWORD)
                );

  if (!valid) {
    return res.status(401).json({
      ok: false,
      message: "LOGIN AUTHENTICATION FAILURE"
    });
  }

  res.json({
    ok: true,
    token: makeToken(),
    prompt: "$ "
  });
});

app.post("/api/command", (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!validToken(token)) {
    return res.status(401).json({ ok: false, message: "ACCESS DENIED" });
  }

  const command = String(req.body?.command || "").trim().toUpperCase();

  const responses = {
    "HELP": [
      "Available commands:",
      "  HELP       Display this message",
      "  DIR        List directory",
      "  TYPE FILE  Display a text file",
      "  WHOAMI     Display current user",
      "  TIME       Display system time",
      "  CLEAR      Clear terminal",
      "  LOGOUT     End session"
    ],
    "DIR": [
      "Directory SYS$SYSTEM:[SYSTEM]",
      "",
      "README.TXT        1",
      "NOTICE.LOG       4",
      "ARCHIVE.DAT     17",
      "NODES.DIR        1",
      "",
      "Total of 4 files."
    ],
    "WHOAMI": [
      "SYSTEM"
    ],
    "TIME": [
      new Date().toISOString().replace("T", " ").replace("Z", " UTC")
    ],
    "TYPE README.TXT": [
      "SYSTEM NOTICE",
      "-------------",
      "This terminal is part of an ARG.",
      "Some files are intentionally incomplete.",
      "Look carefully. The machine remembers."
    ],
    "TYPE NOTICE.LOG": [
      "NOTICE.LOG",
      "----------",
      "22-AUG-1996 02:57",
      "NODE CAL3",
      "STATUS: QUIET",
      "MESSAGE: [REDACTED]"
    ],
    "TYPE ARCHIVE.DAT": [
      "ARCHIVE.DAT",
      "-----------",
      "BINARY FILE -- DISPLAY DISABLED",
      "Hint: the directory is not the whole system."
    ]
  };

  if (command === "CLEAR") {
    return res.json({ ok: true, clear: true, lines: [] });
  }

  if (command === "LOGOUT") {
    return res.json({ ok: true, logout: true, lines: ["SYSTEM LOGGED OUT."] });
  }

  if (responses[command]) {
    return res.json({ ok: true, lines: responses[command] });
  }

  return res.json({
    ok: true,
    lines: [`%DCL-W-IVVERB, unrecognized command - ${command}`]
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`ARG terminal running at http://localhost:${PORT}`);
});