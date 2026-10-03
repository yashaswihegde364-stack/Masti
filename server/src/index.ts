import "dotenv/config";
import express from "express";
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

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => console.log(`Masti server listening on :${port}`));
