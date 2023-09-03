import dotenv from "dotenv";
dotenv.config();
import TelegramApi from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import mariadb from "mariadb";

import onText from "./modules/on_text.js";
import onCallbackQuery from "./modules/on_callback_query.js";
import onLocation from "./modules/on_location.js";

const token = process.env.BOT_TOKEN;
const weatherApiKey = process.env.WEATHER_API_KEY;
const chatGPTKey = process.env.CHATGPT_KEY;
const chatGPTOrg = process.env.CHATGPT_ORGANIZATION;

const bot = new TelegramApi(token, { polling: true });

import { Configuration, OpenAIApi } from "openai";
const configuration = new Configuration({
  organization: chatGPTOrg,
  apiKey: chatGPTKey,
});
const openai = new OpenAIApi(configuration);

async function asyncConnection() {
  try {
    const conn = await mariadb.createConnection({
      host: process.env.BOT_HOST,
      user: process.env.BOT_USER,
      password: process.env.BOT_PASSWORD,
      database: process.env.BOT_DATABASE,
    });

    const displayToDos = (list) => {
      return list.length > 0
        ? list.map((el, i) => `№${i + 1}: ${el.text}`).join("\n")
        : "На сегодня дел нет, офигенно!";
    };

    const toDoBtns = {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [{ text: "Показать список дел", callback_data: "showtodolist" }],
          [
            { text: "➕", callback_data: "addtodoitem" },
            { text: "✏️", callback_data: "edittodoitem" },
            { text: "❌", callback_data: "deletetodoitem" },
            // { text: "✅", callback_data: "crossouttodoitem" }, to be added...
          ],
          [{ text: "Написать ChatGPT", callback_data: "writechatgpt" }],
        ],
        // keyboard: [
        //   [{ text: "test button" }, { text: "test button 2" }],
        //   [{ text: "test button 3" }, { text: "test button 4" }],
        // ],
      }),
    };

    let mode = {};

    bot.on("text", async (msg) => {
      mode = await onText(msg, bot, conn, mode, toDoBtns, displayToDos, openai);
    });

    bot.on("callback_query", async (msg) => {
      mode = await onCallbackQuery(
        msg,
        conn,
        mode,
        bot,
        displayToDos,
        toDoBtns
      );
    });

    bot.on("location", async (msg) => {
      onLocation(msg, weatherApiKey, bot, toDoBtns);
    });
  } catch (error) {
    fs.appendFileSync(path.join(__dirname, "log.txt"), JSON.stringify(error));
    process.exit();
  }
}
asyncConnection();
