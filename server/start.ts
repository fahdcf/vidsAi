import { app } from "./app";
import { retireLegacyRenderJobs, startJobs } from "./jobs";
import { origin } from "./env";
import { startMotionJobs } from "./motion/service";
retireLegacyRenderJobs();
const server = app.listen(
    Number(new URL(origin).port) || 8100,
    "127.0.0.1",
    () => console.log("VidsAI TypeScript server ready"),
);
const timer = startJobs();
const motionTimer = startMotionJobs();
process.on("SIGTERM", () => {
    clearInterval(timer);
    clearInterval(motionTimer);
    server.close();
});
