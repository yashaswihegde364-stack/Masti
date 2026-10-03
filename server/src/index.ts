import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { chatRouter } from "./routes/chat.js";
import { verseRouter } from "./routes/verse.js";
import { journalRouter } from "./routes/journal.js";
import { subscriptionRouter } from "./routes/subscription.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/chat", chatRouter);
app.use("/verse", verseRouter);
app.use("/journal", journalRouter);
app.use("/subscription", subscriptionRouter);

// Catches everything forwarded by asyncHandler (see middleware/asyncHandler.ts)
// plus any synchronous throw — without this, an async route error is an
// unhandled rejection that crashes the whole process, not just that request.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => console.log(`Masti server listening on :${port}`));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection outside request handling:", reason);
});
