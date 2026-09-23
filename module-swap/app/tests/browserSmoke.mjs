const [, , port = "9222", baseUrl = "http://127.0.0.1:5173"] = process.argv;

const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
const page = pages.find((candidate) => candidate.type === "page" && candidate.url.startsWith(baseUrl));
if (!page) throw new Error(`No Chrome page found for ${baseUrl} on port ${port}.`);

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 1;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (typeof message.id !== "number") return;
  const handlers = pending.get(message.id);
  if (!handlers) return;
  pending.delete(message.id);
  if (message.error) handlers.reject(new Error(JSON.stringify(message.error)));
  else handlers.resolve(message.result);
});

function command(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function snapshot() {
  const result = await command("Runtime.evaluate", {
    expression: `(() => {
      const report = document.querySelector("#self-test-report");
      const error = document.querySelector("[data-role='error']");
      return {
        href: location.href,
        status: report?.dataset.result ?? null,
        report: report?.textContent ?? null,
        error: error && !error.hidden ? error.textContent : null,
      };
    })()`,
    returnByValue: true,
  });
  return result.result.value;
}

async function waitForStatus(status, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await snapshot();
    if (value.error) throw new Error(`Browser page error: ${value.error}`);
    if (value.status === status) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for browser self-test status '${status}'.`);
}

await command("Page.enable");
await command("Runtime.enable");
await command("Page.navigate", { url: `${baseUrl}/?selftest=prepare` });
const prepared = await waitForStatus("prepared");
await command("Page.navigate", { url: `${baseUrl}/?selftest=1` });
const passed = await waitForStatus("pass", 60_000);

socket.close();
console.log(JSON.stringify({
  prepared: JSON.parse(prepared.report),
  passed: JSON.parse(passed.report),
}, null, 2));
