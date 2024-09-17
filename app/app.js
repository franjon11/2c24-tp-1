const express = require('express');
const axios = require('axios');
const { config } = require('dotenv');
config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/ping', (req, res) => {
    res.json({ message: 'pong' });
});


app.get('/dictionary', async (req, res) => {
    const word = req.query.word;
    
    if (!word) {
      return res.status(400).json({ error: 'No word provided' });
    }
  
    try {
      const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);

      if (!response) {
        return res.status(response.status).json({ error: 'Error fetching word definition' });
      }
    
      res.json({ phonetics: response.data[0].phonetics, meanings: response.data[0].meanings });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
});



app.get('/spaceflight_news', async (req, res) => {
    try {
      const response = await axios.get('https://api.spaceflightnewsapi.net/v4/articles?limit=5');
      
      if (!response) {
        return res.status(response.status).json({ error: 'Error fetching spaceflight news' });
      }
      const titles = response.data.results.map(article => article.title);
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