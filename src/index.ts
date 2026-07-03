import express from "express";
import subjectsRouter from "./routes/subject";
import cors from "cors";

const app = express();
const port = process.env.PORT;

app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
}))

app.use(express.json());

app.use('/api/subjects', subjectsRouter);

app.get("/", (req, res) => {
    res.send('Hello, Welcome to the Classroom API!');
});

app.listen(port, () => {
    console.log(`Listening on port http://localhost:${port}`);
});