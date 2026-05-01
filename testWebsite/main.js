const terminal = document.getElementById("terminal");
const cmd = document.getElementById("cmd");
const inputLine = document.querySelector(".input-line");
const sendBtn = document.getElementById("sendBtn");
const cmdInput = document.getElementById("cmdInput");
const getInputBtn = document.getElementById("getInputBtn");
const runCodeBtn = document.getElementById("runCodeBtn");

let editorInstance = null;

window.initMonaco((editor) => {
  editorInstance = editor;
});

// print output (immutable)
function print(...args) {
  let options = {};

  // detect if last argument is options object
  if (
    args.length > 0 &&
    typeof args[args.length - 1] === "object" &&
    !Array.isArray(args[args.length - 1])
  ) {
    options = args.pop();
  }

  const text = args.map(v => String(v)).join(" ");

  const line = document.createElement("div");
  line.className = "line";
  line.textContent = text;

  if (options.color) {
    line.style.color = options.color;
  }

  terminal.insertBefore(line, inputLine);
  terminal.scrollTop = terminal.scrollHeight;
}

function formatTranslationError(error) {
  if (error && typeof error.formatForUser === 'function') {
    return error.formatForUser();
  }
  if (error && error.userMessage) {
    return error.userMessage;
  }
  return String(error.message || error);
}

async function translateEditorCode(code) {
  if (typeof window.translateCode === 'function') {
    return await window.translateCode(code);
  }

  if (window.translateCodeLoading instanceof Promise) {
    await window.translateCodeLoading;
    if (typeof window.translateCode === 'function') {
      return await window.translateCode(code);
    }
  }

  throw new Error('Translator is not available in this environment.');
}

function clearTerminal() {
  const lines = Array.from(terminal.querySelectorAll('.line'));
  for (const line of lines) {
    if (line !== inputLine) {
      line.remove();
    }
  }
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
  if (!editorInstance) {
    print("Editor not ready");
    return;
  }

  clearTerminal();
  const code = editorInstance.getValue();
  let translatedCode;

  try {
    translatedCode = await translateEditorCode(code);
    print(translatedCode);
  } catch (e) {
    console.error('Translation dev error:', e.devMessage || e);
    print(formatTranslationError(e), { color: 'yellow' });
    return;
  }

  try {
    await runCode(translatedCode);
  } catch (e) {
    console.error('Runtime error:', e);
    print(`Runtime error: ${e.message || e}`, { color: 'yellow' });
  }
});

async function runCode(codeString) {
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

  const scope = new Proxy({}, {
    get(obj, prop) {
      if ( typeof obj[prop] === 'undefined') {
        throw new TranslationError({
          devMessage: `Variable '${prop}' used before assignment`,
          userMessage: `Η μεταβλητή '${prop}' δεν έχει αρχικοποιηθεί.`
        });
      }
      return obj[prop];
    },
    
    set(obj, prop, value) {
      obj[prop] = value;
      return true;
    }
  });

  const api = {
    print,
    getInput,
    scope,
    TranslationError: window.runtimeHelpers?.TranslationError,
    ...(window.runtimeHelpers || {})
  };

  const fn = new AsyncFunction("api", `
    Object.assign(globalThis, api);
    const scope = globalThis.scope;

    ${codeString}
  `);

  await fn(api);
}



// initial state
focusInput();