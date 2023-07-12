const token = "6392743881:AAEaq6wSqJTWdQZclvcSo5cI78dZCYiNXS0";
const TelegramApi = require("node-telegram-bot-api");
const bot = new TelegramApi(token, { polling: true });
const fs = require("fs");
const path = require("path");

let toDoList = [];
toDoList.toDoDisplay = function () {
  let toDoDisplay;
  if (toDoList.length > 0) {
    fs.writeFileSync(path.join(__dirname, "log.txt"), JSON.stringify(toDoList));
    toDoDisplay = "";
    toDoList.forEach((el, index) => {
      toDoDisplay += `№${index + 1}: ${el} \n`;
    });
  } else {
    toDoDisplay = "На сегодня дел нет, кайф!";
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
    // fs.writeFileSync(path.join(__dirname, "log.txt"), JSON.stringify(msg));
    const text = msg.text;
    const chat = msg.chat.id;
    console.log(text);
    console.log(`mode: ${mode}`);

    if (text === "/start") {
      return bot.sendMessage(chat, "Privet", toDoBtns);
    }
    if (mode === "toDoAddingItem") {
      toDoList.push(text);
      mode = "default";
      return bot.sendMessage(
        chat,
        `Кайф, новый список дел:\n\n${toDoList.toDoDisplay()}`,
        toDoBtns
      );
    }

    if (mode === "toDoDeletingItem" && text <= toDoList.length + 1) {
      toDoList.splice(text - 1, 1);
      mode = "default";
      return bot.sendMessage(
        chat,
        `Кайф, новый список дел:\n\n${toDoList.toDoDisplay()}`,
        toDoBtns
      );
    } else return bot.sendMessage(chat, "Не понял");
  });

  bot.on("callback_query", async (msg) => {
    const chatId = msg.message.chat.id;

    if (msg.data === "showtodolist") {
      fs.writeFileSync(path.join(__dirname, "log.txt"), JSON.stringify(msg));
      return bot.sendMessage(chatId, toDoList.toDoDisplay(), toDoBtns);
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
  });
};

start();
