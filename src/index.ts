import AgentApi from "apminsight";
AgentApi.config();

import express from "express";
import cors from "cors";
import {toNodeHandler} from "better-auth/node";

import securityMiddleware from "./middleware/security.js";
import subjectsRouter from "./routes/subject.js";

import {auth} from "./lib/auth.js";

const app = express();
const port = process.env.PORT;

if(!process.env.FRONTEND_URL) throw new Error("Missing FRONTEND_URL in .env file");

app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
}))

app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());

app.use(securityMiddleware);

app.use('/api/subjects', subjectsRouter);

app.get("/", (req, res) => {
    res.send('Hello, Welcome to the Classroom API!');
});

app.listen(port, () => {
    console.log(`Listening on port http://localhost:${port}`);
});