const terminal = document.getElementById("terminal");
const cmd = document.getElementById("cmd");
const inputLine = document.querySelector(".input-line");
const sendBtn = document.getElementById("sendBtn");
const cmdInput = document.getElementById("cmdInput");

// print output (immutable)
function print(text) {
  const line = document.createElement("div");
  line.className = "line";
  line.textContent = text;

  terminal.insertBefore(line, inputLine);
  terminal.scrollTop = terminal.scrollHeight;
}

// submit command
function submit() {
  const value = cmd.textContent.trim();
  if (!value) return;

  print("> " + value);
  console.log("Command submitted:", value);
  cmd.textContent = "";
}

// ensure focus stays correct
function focusInput() {
  cmd.focus();
}

// Enter handling (capture reliably)
cmd.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    submit();
  }
});

// click anywhere in terminal focuses input
terminal.addEventListener("click", () => {
  focusInput();
});

// also ensure typing works after any DOM interaction
document.addEventListener("selectionchange", () => {
  if (document.activeElement !== cmd) return;
});

sendBtn.addEventListener("click", () => {
  const value = cmdInput.value.trim();
  if (!value) return;

  print(value);
  cmdInput.value = "";
});

// initial state
print("Terminal ready.");
focusInput();