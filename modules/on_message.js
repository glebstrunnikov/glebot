const on_message = async (msg, bot, conn, mode, toDoBtns, toDoDisplay) => {
  const text = msg.text;
  const chat = msg.chat.id;
  const userId = msg.chat.id;

  let toDoList = await conn.query(
    `SELECT * FROM tasks WHERE user_id=${userId}`
  );

  if (text === "/start") {
    bot.sendMessage(chat, "Privet", toDoBtns);
    return mode;
  } else if (mode === "toDoAddingItem") {
    toDoList.push({ text: text });
    conn.query(
      `INSERT INTO tasks (user_id, text) VALUES('${userId}', '${text}')`
    );
    bot.sendMessage(
      chat,
      `Кайф, новый список дел:\n\n${toDoDisplay(toDoList)}`,
      toDoBtns
    );
    return mode;
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
      bot.sendMessage(
        chat,
        `Кайф, новый список дел:\n\n${toDoDisplay(toDoList)}`,
        toDoBtns
      );
      return mode;
    } else {
      bot.sendMessage(
        chat,
        `Так не пойдет, пришлите число больше 0 и меньше ${
          toDoList.length + 1
        }\n\n${toDoDisplay(toDoList)}`
      );
      return mode;
    }
  } else {
    bot.sendMessage(chat, "Не понял");
    return mode;
  }
};

module.exports = on_message;
