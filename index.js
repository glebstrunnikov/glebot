import dotenv from "dotenv";
dotenv.config();
import TelegramApi from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import mariadb from "mariadb";

import on_text from "./modules/on_text.js";
import on_callback_query from "./modules/on_callback_query.js";
import on_location from "./modules/on_location.js";

const token = process.env.BOT_TOKEN;
const host = process.env.BOT_HOST;
const user = process.env.BOT_USER;
const password = process.env.BOT_PASSWORD;
const database = process.env.BOT_DATABASE;
const weatherApiKey = process.env.WEATHER_API_KEY;
const bot = new TelegramApi(token, { polling: true });

fs.writeFileSync(path.join(__dirname, "log.txt"), "program init \n");

async function asyncConnection() {
  try {
    const conn = await mariadb.createConnection({
      host: host,
      user: user,
      password: password,
      database: database,
    });

    const toDoDisplay = function (list) {
      let toDoDisplay;
      if (list.length > 0) {
        toDoDisplay = "";
        list.forEach((el, index) => {
          toDoDisplay += `№${index + 1}: ${el.text} \n`;
        });
      } else {
        toDoDisplay = "На сегодня дел нет, офигенно!";
      }
      return toDoDisplay;
    };

    const toDoBtns = {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [{ text: "Показать список дел", callback_data: "showtodolist" }],
          [{ text: "Добавить дело", callback_data: "addtodoitem" }],
          [{ text: "Удалить дело", callback_data: "deletetodoitem" }],
        ],
      }),
    };

    bot.setMyCommands([
      { command: "/showtodolist", description: "Показать список дел" },
      { command: "/addtodoitem", description: "Добавить дело" },
      {
        command: "/deletetodoitem",
        description: "Дело сделано или больше не актуально",
      },
    ]);

    let mode = "default";

    bot.on("text", async (msg) => {
      mode = await on_text(msg, bot, conn, mode, toDoBtns, toDoDisplay);
    });

    bot.on("callback_query", async (msg) => {
      mode = await on_callback_query(
        msg,
        conn,
        mode,
        bot,
        toDoDisplay,
        toDoBtns
      );
    });

    bot.on("location", async (msg) => {
      on_location(msg, weatherApiKey, bot, toDoBtns);
    });
  } catch (error) {
    fs.appendFileSync(path.join(__dirname, "log.txt"), JSON.stringify(error));
  }
}
asyncConnection();
