import express from "express";
import axios from "axios";
import { config } from "dotenv";
import { nanoid } from "nanoid";
import { StatsD } from "hot-shots";
config();

const app = express();
const PORT = process.env.PORT || 3000;
const id = nanoid();

var stats = new StatsD({
  host: "graphite",
  port: 8125,
  prefix: `hotshots.`,
});

app.use((req, res, next) => {
  res.setHeader("X-API-Id", id);
  next();
});

app.get("/ping", (req, res) => {
  const endpointTime = new Date();
  res.json({ message: "pong" });
  stats.timing("Endpoint", endpointTime);
});

app.get("/dictionary", async (req, res) => {
  const endpointTime = new Date();
  const word = req.query.word;

  if (!word) {
    stats.timing("Endpoint", endpointTime);
    return res.status(400).json({ error: "No word provided" });
  }

  try {
    const apiTime = new Date();
    const response = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
    );
    stats.timing("API", apiTime);

    res.json({
      phonetics: response.data[0].phonetics,
      meanings: response.data[0].meanings,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
  stats.timing("Endpoint", endpointTime);
});

app.get("/spaceflight_news", async (req, res) => {
  const endpointTime = new Date();
  try {
    const apiTime = new Date();
    const response = await axios.get(
      "https://api.spaceflightnewsapi.net/v4/articles?limit=5"
    );
    stats.timing("API", apiTime);

    const titles = response.data.results.map((article) => article.title);
    res.json(titles);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
  stats.timing("Endpoint", endpointTime);
});

app.get("/quote", async (req, res) => {
  const endpointTime = new Date();
  try {
    const apiTime = new Date();
    const response = await axios.get("https://techy-api.vercel.app/api/json");
    stats.timing("API", apiTime);

    res.json({
      quote: response.data.message,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
  stats.timing("Endpoint", endpointTime);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
