const onMessage = async (
  msg,
  bot,
  conn,
  mode,
  toDoBtns,
  displayToDos,
  openai
) => {
  const text = msg.text;
  const chat = msg.chat.id;
  const userId = msg.chat.id;
  if (!mode[chat]) {
    mode[chat] = "default";
  }

  let toDoList = await conn.query(
    `SELECT * FROM tasks WHERE user_id=${userId}`
  );

  if (text === "/start") {
    bot.sendMessage(chat, "Privet", toDoBtns);
    mode[chat] = "default";
    return mode;
  }
  if (mode[chat] === "toDoAddingItem") {
    toDoList.push({ text: text });
    conn.query(
      `INSERT INTO tasks (user_id, text) VALUES('${userId}', '${text}')`
    );
    bot.sendMessage(
      chat,
      `Кайф, новый список дел:\n\n${displayToDos(toDoList)}`,
      toDoBtns
    );
    return mode;
  }

  if (mode[chat] === "toDoDeletingItem") {
    if (
      Number(text) <= toDoList.length &&
      Number(text) > 0 &&
      Number(text) === Math.floor(Number(text))
    ) {
      const toDoToDelete = toDoList[text - 1];
      conn.query(`DELETE FROM tasks WHERE id='${toDoToDelete.id}'`);
      mode[chat] = "default";
      toDoList.splice(text - 1, 1);
      bot.sendMessage(
        chat,
        `Кайф, новый список дел:\n\n${displayToDos(toDoList)}`,
        toDoBtns
      );
      return mode;
    } else {
      bot.sendMessage(
        chat,
        `Так не пойдет, пришлите число больше 0 и меньше ${
          toDoList.length + 1
        }\n\n${displayToDos(toDoList)}`
      );
      return mode;
    }
  }
  if (mode[chat] === "writeChatGpt") {
    if (text.trim() === "/exit") {
      bot.sendMessage(
        chat,
        "Окей, вы больше не разговариваете с ChatGPT",
        toDoBtns
      );
      mode[chat] = "default";
      return mode;
    } else {
      const chatCompletion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: text }],
      });
      await bot.sendMessage(
        chat,
        chatCompletion.data.choices[0].message.content
      );
      return mode;
    }
  }
  bot.sendMessage(chat, "Не понял");
  return mode;
};

export default onMessage;
