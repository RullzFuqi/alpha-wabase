import { spawn } from "child_process";

(function start() {
  const bot = spawn(process.argv0, ["bot.js", ...process.argv.slice(2)], {
    stdio: ["inherit", "inherit", "inherit", "ipc"],
  });
  bot.on("message", (msg) => {
    if(msg === "restart") {
      bot.kill();
      bot.once("close", start);
    }
  }).on("exit", (code) => {
    if(code) start();
  }).on("error", console.log);
})();