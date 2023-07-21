require("dotenv").config();
const TelegramApi = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");
const mariadb = require("mariadb");
const token = process.env.BOT_TOKEN;
const host = process.env.BOT_HOST;
const user = process.env.BOT_USER;
const password = process.env.BOT_PASSWORD;
const database = process.env.BOT_DATABASE;
const weatherApiKey = process.env.WEATHER_API_KEY;
const bot = new TelegramApi(token, { polling: true });
const fetch = require("node-fetch");
const on_message = require("./modules/on_message.js");
const on_callback_query = require("./modules/on_callback_query.js");

fs.writeFileSync(path.join(__dirname, "log.txt"), "program init \n");

async function asyncConnection() {
  fs.appendFileSync(
    path.join(__dirname, "log.txt"),
    `connection attempt started \nuser ${user} \n`
  );

  try {
    const conn = await mariadb.createConnection({
      host: host,
      user: user,
      password: password,
      database: database,
    });

    fs.appendFileSync(path.join(__dirname, "log.txt"), "sending query \n");
    const res = await conn.query("DESCRIBE tasks;");
    fs.appendFileSync(path.join(__dirname, "log.txt"), "query sent \n");
    // console.log(res);
    fs.appendFileSync(
      path.join(__dirname, "log.txt"),
      `response: ${JSON.stringify(res)} \n`
    );

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
      mode = await on_message(msg, bot, conn, mode, toDoBtns, toDoDisplay);
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
      let currentWeather = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${msg.location.latitude}&lon=${msg.location.longitude}&appid=${weatherApiKey}&units=metric&lang=ru`
      );
      currentWeather = await currentWeather.json();
      let tomorrowWeather = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${msg.location.latitude}&lon=${msg.location.longitude}&appid=${weatherApiKey}&units=metric&cnt=8&lang=ru`
      );
      tomorrowWeather = await tomorrowWeather.json();

      let listOfWeatherConditions = [];
      tomorrowWeather.list.forEach((threeHourlyForecast) => {
        threeHourlyForecast.weather.forEach((weatherObject) => {
          if (
            listOfWeatherConditions.indexOf(weatherObject.description) === -1
          ) {
            listOfWeatherConditions.push(weatherObject.description);
          }
        });
      });

      let tomorrowTempMax;
      let tomorrowTempMin;
      tomorrowWeather.list.forEach((threeHourlyForecast) => {
        if (!tomorrowTempMax) {
          tomorrowTempMax = threeHourlyForecast.main.temp;
        }
        if (!tomorrowTempMin) {
          tomorrowTempMin = threeHourlyForecast.main.temp;
        }
        if (threeHourlyForecast.main.temp > tomorrowTempMax) {
          tomorrowTempMax = threeHourlyForecast.main.temp;
        }
        if (threeHourlyForecast.main.temp < tomorrowTempMin) {
          tomorrowTempMin = threeHourlyForecast.main.temp;
        }
      });
      console.log(listOfWeatherConditions);
      console.log("max: " + tomorrowTempMax + ", min: " + tomorrowTempMin);
      const weatherReport = `Температура сейчас: ${
        Math.floor(currentWeather.main.temp * 10) / 10
      }, ${currentWeather.weather[0].description} (ощущается как ${
        Math.floor(currentWeather.main.feels_like * 10) / 10
      })\n\nВ ближайшие сутки: от ${Math.floor(tomorrowTempMin * 10) / 10} до ${
        Math.floor(tomorrowTempMax * 10) / 10
      }, ${listOfWeatherConditions.join(", ")}`;
      bot.sendMessage(msg.chat.id, weatherReport);
    });
  } catch (error) {
    fs.appendFileSync(path.join(__dirname, "log.txt"), JSON.stringify(error));
  }
}
asyncConnection();
