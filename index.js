const TelegramApi = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");
const mariadb = require("mariadb");
const dotenv = require("dotenv");
const token = process.env.TOKEN;
const host = process.env.HOST;
const user = process.env.USER;
const password = process.env.PASSWORD;
const database = process.env.DATABASE;
const bot = new TelegramApi(token, { polling: true });

fs.appendFileSync(path.join(__dirname, "log.txt"), "program init \n");

async function asyncConnection() {
  fs.appendFileSync(path.join(__dirname, "log.txt"), "connection started \n");
  const conn = await mariadb.createConnection({
    host: host,
    user: user,
    password: password,
    database: database,
  });

  try {
    const res = await conn.query("DESCRIBE tasks;");
    console.log(res);
    fs.appendFileSync(
      path.join(__dirname, "log.txt"),
      `response: ${JSON.stringify(res)} \n`
    );
    return res;
  } catch (error) {
    fs.appendFileSync(path.join(__dirname, "log.txt"), JSON.stringify(error));
  } finally {
    conn.end();
  }
}
asyncConnection();

// conn.connect((err) => {
//   if (err) {
//     console.log(err);
//     fs.writeFileSync(path.join(__dirname, "log.txt"), JSON.stringify(err));
//     return err;
//   } else {
//     console.log("database ok");
//   }
// });

// let toDoList = [];
const toDoDisplay = function (toDoList) {
  let toDoDisplay;
  if (toDoList.length > 0) {
    toDoDisplay = "";
    toDoList.forEach((el, index) => {
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

const start = () => {
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

    conn.query(`SELECT * FROM tasks WHERE user_id=${userId}`, (err, result) => {
      if (err) {
        console.log(err);
        fs.writeFileSync(path.join(__dirname, "log.txt"), JSON.stringify(err));
        return err;
      } else {
        let toDoList = result;

        if (text === "/start") {
          return bot.sendMessage(chat, "Privet", toDoBtns);
        }
        if (mode === "toDoAddingItem") {
          toDoList.push({ text: text });
          conn.query(
            `INSERT INTO tasks (user_id, text) VALUES('${userId}', '${text}')`,
            (err, result) => {
              if (err) {
                console.log(err);
                fs.writeFileSync(
                  path.join(__dirname, "log.txt"),
                  JSON.stringify(err)
                );
                return err;
              } else {
                mode = "default";
                return bot.sendMessage(
                  chat,
                  `Кайф, новый список дел:\n\n${toDoDisplay(toDoList)}`,
                  toDoBtns
                );
              }
            }
          );
        }

        if (mode === "toDoDeletingItem" && text <= toDoList.length + 1) {
          const toDoToDelete = toDoList[text - 1];
          conn.query(`DELETE FROM tasks WHERE id='${toDoToDelete.id}'`);
          mode = "default";
          toDoList.splice(text - 1, 1);
          return bot.sendMessage(
            chat,
            `Кайф, новый список дел:\n\n${toDoDisplay(toDoList)}`,
            toDoBtns
          );
        } else return bot.sendMessage(chat, "Не понял");
      }
    });
  });

  bot.on("callback_query", async (msg) => {
    const chatId = msg.message.chat.id;
    conn.query(`SELECT * FROM tasks WHERE user_id=${chatId}`, (err, result) => {
      if (err) {
        console.log(err);
        fs.writeFileSync(path.join(__dirname, "log.txt"), JSON.stringify(err));
      } else {
        let toDoList = result;
        if (msg.data === "showtodolist") {
          return bot.sendMessage(chatId, toDoDisplay(toDoList), toDoBtns);
        }

        if (msg.data === "addtodoitem") {
          mode = "toDoAddingItem";
          return bot.sendMessage(chatId, "Итак, дело:");
        }

        if (msg.data === "deletetodoitem") {
          if (toDoList.length > 0) {
            mode = "toDoDeletingItem";

            return bot.sendMessage(
              chatId,
              "Дело под каким номером вы хотите удалить? Пришлите число"
            );
          } else {
            return bot.sendMessage(
              chatId,
              "Дел в списке нет, что ты удалять собрался?"
            );
          }
        }
      }
    });
  });
};

// start();

// fs.appendFileSync(path.join(__dirname, "log.txt"), JSON.stringify(error));
