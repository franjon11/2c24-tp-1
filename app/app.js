import express from "express";
import axios from "axios";
import { config } from "dotenv";
import { nanoid } from "nanoid";
import { createClient } from "redis";
import { StatsD } from "hot-shots";
config();

const client = await createClient({
  url: "redis://redis:6379",
})
  .on("error", (err) => console.log("Redis Client Error", err))
  .connect();

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

/// Lazy population: We will populate the cache only when the user requests the data
/// TTL: 10 hours
app.get("/dictionary", async (req, res) => {
  const endpointTime = new Date();
  const word = req.query.word;
  if (!word) {
    stats.timing("Endpoint", endpointTime);
    return res.status(400).json({ error: "No word provided" });
  }

  // check if word is in cache
  const cachedWord = await client.get(`dictionary:${word}`);
  if (cachedWord) {
    stats.timing("Endpoint", endpointTime);
    return res.json(JSON.parse(cachedWord));
  }

  try {
    const apiTime = new Date();
    const response = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
    );
    stats.timing("API", apiTime);

    const data = {
      phonetics: response.data[0].phonetics,
      meanings: response.data[0].meanings,
    };
    // Save to cache for 10 hours
    await client.set(`dictionary:${word}`, JSON.stringify(data), { EX: 36000 });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
  stats.timing("Endpoint", endpointTime);
});

/// Active population: We will populate the cache every 10 mins
/// Size: 5 news
/// TTL: 10 min
app.get("/spaceflight_news", async (req, res) => {
  const endpointTime = new Date();
  const cachedNews = await client.get("spaceflight_news");

  if (cachedNews) {
    stats.timing("Endpoint", endpointTime);
    return res.json(JSON.parse(cachedNews));
  }
  try {
    const apiTime = new Date();
    const response = await axios.get(
      "https://api.spaceflightnewsapi.net/v4/articles?limit=5"
    );
    stats.timing("API", apiTime);

    const titles = response.data.results.map((article) => article.title);

    // Save to cache for 10 mins
    await client.set("spaceflight_news", JSON.stringify(titles), { EX: 600 });
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
