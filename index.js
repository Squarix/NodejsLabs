const express = require('express');
const hash = require('object-hash');
const glob = require('glob');
const path = require('path');
const crypto = require('crypto');
const moment = require('moment');
const BluebirdPromise = require('bluebird');


const fs = require('fs').promises;

const newsApi = require('./lib/news-api');
const { formatFrom } = require('./utils/date.helper');

const app = express();

const newsDir = path.join(__dirname, 'news');

const findFile = (name) => new Promise((resolve, reject) =>
  glob(path.join(newsDir, name), {}, (err, files) => {
    if (err) {
      return reject(err)
    }

    resolve(files);
  })
);

app.use('/', function (req, res, next) {
  const { from, query, limit } = req.query;
  let errors = [];
    if (!moment(new Date(from)).isValid()) {
    errors.push('From parameter is invalid');
  }

  if (!query) {
    errors.push('Query is required param!');
  }

  if (limit) {
    const parsedLimit = Number.parseInt(limit);
    isNaN(parsedLimit) && errors.push('Limit parameter is not an integer');
  }

  if (errors.length) {
    return res.status(400).json({ errors });
  }

  next();
});

app.get('/', async function (req, res) {
  const {from, limit, query} = req.query;

  const news = await newsApi.getNews(query, formatFrom(from), limit);
  const syncedNews = await BluebirdPromise.map(news, async article => {
      // article.title в этом случае выступает как соль, чтобы максимально снизить количество коллизий второго уровня
      const articleHash = crypto.createHash('sha256')
        .update(article.title + hash(article))
        .digest('hex');

      const files = await findFile(articleHash);

      let content, timestamp;
      if (!files.length) {
        const filePath = path.join(newsDir, articleHash);

        content = article.content || '';
        await fs.writeFile(filePath, content, {encoding: 'utf8'});
        timestamp = await fs.stat(filePath).then(stat => stat.birthtime);
      } else {
        content = await fs.readFile(files[0], {encoding: 'utf8'});
        timestamp = await fs.stat(files[0]).then(stat => stat.birthtime);
      }

      return {content, timestamp};
    }, { concurrency: 50 },
    // Цифра взята из головы, просто чтобы ограничить количество одновременно обрабатываемых промисов, зависит во многом от сервера, на котором запускаем
  );

  res.json(syncedNews);
});

app.listen(3000, () => {
  console.log('Server started on 3000');
});