import express from 'express';
import axios from 'axios';
import { config } from 'dotenv';
import { nanoid } from 'nanoid';
import { createClient } from 'redis';
config();


const client = await createClient({
    url: 'redis://redis:6379'
  })
  .on('error', err => console.log('Redis Client Error', err))
  .connect();

const app = express();
const PORT = process.env.PORT || 3000;
const id = nanoid();

app.use((req, res, next) => {
    res.setHeader('X-API-Id', id);
    next();
});

app.get('/ping', (req, res) => {
    res.json({ message: 'pong' });
});

/// Lazy population: We will populate the cache only when the user requests the data
/// TTL: 10 hours
app.get('/dictionary', async (req, res) => {
    const word = req.query.word;
    if (!word) {
      return res.status(400).json({ error: 'No word provided' });
    }

    // check if word is in cache
    const cachedWord = await client.get(`dictionary:${word}`);
    if (cachedWord) {
      return res.json(JSON.parse(cachedWord));
    }
  
    try {
      const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      if (!response) {
        return res.status(response.status).json({ error: 'Error fetching word definition' });
      }

      const data = { phonetics: response.data[0].phonetics, meanings: response.data[0].meanings };
      // Save to cache for 10 hours
      await client.set(`dictionary:${word}`, JSON.stringify(data), { EX: 36000 });
      
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
});


/// Active population: We will populate the cache every 10 mins
/// Size: 5 news
/// TTL: 10 min
app.get('/spaceflight_news', async (req, res) => {
    const cachedNews = await client.get('spaceflight_news');
    
    if (cachedNews) {
      return res.json(JSON.parse(cachedNews));
    }
    try {

      const response = await axios.get('https://api.spaceflightnewsapi.net/v4/articles?limit=5');
      
      if (!response) {
        return res.status(response.status).json({ error: 'Error fetching spaceflight news' });
      }
      const titles = response.data.results.map(article => article.title);
      
      // Save to cache for 10 mins
      await client.set('spaceflight_news', JSON.stringify(titles), { EX: 600 });
      res.json(titles);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

app.get('/quote', async (req, res) => {
  try {
    const response = await axios.get('http://api.quotable.io/quotes/random');
    
    if (!response) {
      return res.status(response.status).json({ error: 'Error fetching random quote' });
    }
    
    res.json({ quote: response.data[0].content, author: response.data[0].author });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});