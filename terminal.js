const screen = document.getElementById("screen");
const inputRow = document.getElementById("inputRow");
const input = document.getElementById("commandInput");
const prompt = document.getElementById("prompt");

let token = null;
let mode = "username";

function write(text = "") {
  screen.append(document.createTextNode(text + "\n"));
}

function typeLine(text, speed = 4) {
  return new Promise(resolve => {
    let i = 0;
    const node = document.createTextNode("");
    screen.append(node);
    const timer = setInterval(() => {
      node.textContent += text[i++] ?? "";
      if (i >= text.length) {
        clearInterval(timer);
        resolve();
      }
    }, speed);
  });
}

function showInput(label) {
  inputRow.classList.remove("hidden");
  prompt.textContent = label;
  input.type = label === "Password: " ? "password" : "text";
  input.value = "";
  input.focus();
}

async function boot() {
  await typeLine("Welcome to OpenVMS (TM) VAX Operating System, Version V7.7 on node CAL3", 1);
  await typeLine("Last interactive login on Thursday, 22-AUG-1996 02:57", 1);
  write("");
  showInput("Username: ");
}

async function login(username, password) {
  try {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ username, password })
    });
    const data = await r.json();

    if (!r.ok) {
      write(" ");
      write("%LOGIN-F-AUTHFAIL, authentication failure");
      showInput("Username: ");
      mode = "username";
      return;
    }

    token = data.token;
    write("");
    write("Welcome, " + username.toUpperCase() + ".");
    write("");
    write("Type HELP for a list of available commands.");
    write("");
    prompt.textContent = "$ ";
    input.type = "text";
    input.value = "";
    mode = "command";
    input.focus();
  } catch {
    write("%SYSTEM-E-NETWORK, server unavailable");
  }
}

async function command(cmd) {
  if (!cmd) return;
  write("$ " + cmd);

  if (cmd.toLowerCase() === "logout") {
    write("SYSTEM LOGGED OUT.");
    token = null;
    mode = "username";
    showInput("Username: ");
    return;
  }

  try {
    const r = await fetch("/api/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ command: cmd })
    });
    const data = await r.json();

    if (!r.ok) {
      write(data.message || "ACCESS DENIED");
      token = null;
      mode = "username";
      showInput("Username: ");
      return;
    }

    if (data.clear) {
      screen.textContent = "";
    } else {
      for (const line of data.lines || []) write(line);
    }

    if (data.logout) {
      token = null;
      mode = "username";
      showInput("Username: ");
    }
  } catch {
    write("%SYSTEM-E-NETWORK, server unavailable");
  }
}

input.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;

  const value = input.value;
  input.value = "";

  if (mode === "username") {
    write("Username: " + value);
    mode = "password";
    showInput("Password: ");
    return;
  }

  if (mode === "password") {
    write("Password: " + "*".repeat(value.length));
    inputRow.classList.add("hidden");
    await login(
      screen.textContent.match(/Username: (.*)\n/)?.[1] || "",
      value
    );
    return;
  }

  await command(value);
});

boot();