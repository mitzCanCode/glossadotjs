const terminal = document.getElementById("terminal");
const cmd = document.getElementById("cmd");
const inputLine = document.querySelector(".input-line");
const sendBtn = document.getElementById("sendBtn");
const cmdInput = document.getElementById("cmdInput");
const getInputBtn = document.getElementById("getInputBtn");
const runCodeBtn = document.getElementById("runCodeBtn");


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


// States for input mode 
let waitingForInput = false;
let inputResolver = null;

function getInput() {
  return new Promise((resolve) => {
    waitingForInput = true;
    inputResolver = resolve;
    cmd.textContent = "";
    focusInput();
  });
}

// Get user input as a Promise
cmd.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();

    const value = cmd.textContent.trim();
    if (!value) return;

    print("> " + value);
    cmd.textContent = "";

    // if we're waiting for input, resolve it
    if (waitingForInput && inputResolver) {
      inputResolver(value);
      waitingForInput = false;
      inputResolver = null;
    }
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


getInputBtn.addEventListener("click", async () => {
  const userInput = await getInput();

  print("You typed: " + userInput);
  console.log("Input received:", userInput);
});


runCodeBtn.addEventListener("click", async () => {
    const sampleCode = `
  print("What is your name?");
  const name = await getInput();

  print("Hello " + name);

  print("How old are you?");
  const age = await getInput();

  print("You are " + age + " years old");
`;
  await runCode(sampleCode);
});

async function runCode(codeString) {
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

  const api = {
    print,
    getInput
  };

  const fn = new AsyncFunction("api", `
    const { print, getInput } = api;
    ${codeString}
  `);

  await fn(api);
}



// initial state
print("Terminal ready.");
focusInput();