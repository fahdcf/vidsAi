import { app } from "./app";
import { startJobs } from "./jobs";
import { origin } from "./env";
const server = app.listen(
    Number(new URL(origin).port) || 8100,
    "127.0.0.1",
    () => console.log("VidsAI TypeScript server ready"),
);
const timer = startJobs();
process.on("SIGTERM", () => {
    clearInterval(timer);
    server.close();
});
