const axios = require('axios');

const API_URL = 'https://newsapi.org/v2/everything';
const API_KEY = '56ebe961104d4ef4a60e4586250e11b7';

const url = `${API_URL}?apiKey=${API_KEY}`;

const getNews = (query, from, limit) => {
    const populatedUrl = `${url}&q=${query}&from=${from}&pageSize=${limit}&page=1`;
    return axios.get(populatedUrl)
        .then(response => response.data.articles)
        .catch(() => []);
}

module.exports = {
    getNews,
}