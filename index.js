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
const bot = new TelegramApi(token, { polling: true });

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
    console.log(res);
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

    let toDoListState;
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

    bot.on("message", async (msg) => {
      const text = msg.text;
      const chat = msg.chat.id;
      const userId = msg.chat.id;

      let toDoList = await conn.query(
        `SELECT * FROM tasks WHERE user_id=${userId}`
      );

      if (text === "/start") {
        return bot.sendMessage(chat, "Privet", toDoBtns);
      } else if (mode === "toDoAddingItem") {
        toDoList.push({ text: text });
        conn.query(
          `INSERT INTO tasks (user_id, text) VALUES('${userId}', '${text}')`
        );
        return bot.sendMessage(
          chat,
          `Кайф, новый список дел:\n\n${toDoDisplay(toDoList)}`,
          toDoBtns
        );
      }

      if (mode === "toDoDeletingItem") {
        if (
          Number(text) <= toDoList.length &&
          Number(text) > 0 &&
          Number(text) === Math.floor(Number(text))
        ) {
          const toDoToDelete = toDoList[text - 1];
          conn.query(`DELETE FROM tasks WHERE id='${toDoToDelete.id}'`);
          mode = "default";
          toDoList.splice(text - 1, 1);
          return bot.sendMessage(
            chat,
            `Кайф, новый список дел:\n\n${toDoDisplay(toDoList)}`,
            toDoBtns
          );
        } else {
          return bot.sendMessage(
            chat,
            `Так не пойдет, пришлите число больше 0 и меньше ${
              toDoList.length + 1
            }\n\n${toDoDisplay(toDoList)}`
          );
        }
      } else return bot.sendMessage(chat, "Не понял");
    });

    bot.on("callback_query", async (msg) => {
      const chatId = msg.message.chat.id;
      let toDoList = await conn.query(
        `SELECT * FROM tasks WHERE user_id=${chatId}`
      );

      if (msg.data === "showtodolist") {
        mode = "default";
        return bot.sendMessage(chatId, toDoDisplay(toDoList), toDoBtns);
      }

      if (msg.data === "addtodoitem") {
        mode = "toDoAddingItem";
        return bot.sendMessage(chatId, "Итак, дело:");
      }

      if (msg.data === "deletetodoitem" && toDoList.length > 0) {
        mode = "toDoDeletingItem";

        return bot.sendMessage(
          chatId,
          "Дело под каким номером вы хотите удалить? Пришлите число"
        );
      }

      if (msg.data === "deletetodoitem" && toDoList.length === 0) {
        return bot.sendMessage(
          chatId,
          "Дел в списке нет, что ты удалять собрался?"
        );
      }
    });
  } catch (error) {
    fs.appendFileSync(path.join(__dirname, "log.txt"), JSON.stringify(error));
  }
}
asyncConnection();
