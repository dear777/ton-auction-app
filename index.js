const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const path = require('path');

const token = '8600973725:AAHU-Y43fQe44GidNJd9P6HN8-JPetoB6MY'; // Вставь токен от BotFather
const bot = new TelegramBot(token, {polling: true});
const app = express();

// Раздаем интерфейс аукциона
app.use(express.static('public'));

// Логика команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Добро пожаловать на Аукцион!', {
    reply_markup: {
      inline_keyboard: [[
        {
          text: 'Открыть Аукцион',
          web_app: { url: 'ТВОЙ_URL_ОТ_RENDER_БУДЕТ_ЗДЕСЬ' } // Пока оставим так
        }
      ]]
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер на порту ${PORT}`));