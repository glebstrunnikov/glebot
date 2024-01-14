const onCallbackQuery = async (
  msg,
  conn,
  mode,
  bot,
  displayToDos,
  toDoBtns,
  chatGptBtns
) => {
  const chatId = msg.message.chat.id;

  if (!mode[chatId]) {
    mode[chatId] = "default";
  }

  let toDoList = await conn.query(
    `SELECT * FROM tasks WHERE user_id=${chatId}`
  );

  if (msg.data === "showtodolist") {
    mode[chatId] = "default";
    bot.sendMessage(chatId, displayToDos(toDoList), toDoBtns);
  }

  if (msg.data === "addtodoitem") {
    mode[chatId] = "toDoAddingItem";
    bot.sendMessage(chatId, "Итак, дело:");
  }

  if (msg.data === "deletetodoitem" && toDoList.length > 0) {
    mode[chatId] = "toDoDeletingItem";

    bot.sendMessage(
      chatId,
      "Дело под каким номером ты хочешь удалить? Пришли число"
    );
  }

  if (msg.data === "deletetodoitem" && toDoList.length === 0) {
    bot.sendMessage(chatId, "Дел в списке нет, что ты удалять собрался?");
  }

  if (msg.data === "edittodoitem" && toDoList.length > 0) {
    mode[chatId] = "toDoEditingItem";

    bot.sendMessage(
      chatId,
      "Пришли номер дела и, через пробел, его новую редакцию"
    );
  }

  if (msg.data === "edittodoitem" && toDoList.length === 0) {
    bot.sendMessage(chatId, "Дел в списке нет, что ты редактировать собрался?");
  }

  if (msg.data === "writechatgpt") {
    bot.sendMessage(
      chatId,
      "Хочешь продолжить диалог или начать новый? \n\nЧтобы выйти из режима диалога с ChatGPT, напиши /exit",
      chatGptBtns
    );
    mode[chatId] = "writeChatGpt";
  }

  if (msg.data === "chatgptnew") {
    bot.sendMessage(
      chatId,
      "Хорошо. Пиши, что ты хочешь сообщить ChatGPT, я передам. \n\nЧтобы выйти из режима диалога с ChatGPT, напиши /exit"
    );
    mode[chatId] = "writeChatGptNew";
  }

  if (msg.data === "chatgptcontinue") {
    bot.sendMessage(
      chatId,
      "Хорошо. Пиши, что ты хочешь сообщить ChatGPT, я передам. \n\nЧтобы выйти из режима диалога с ChatGPT, напиши /exit"
    );
    mode[chatId] = "writeChatGptContinue";
  }

  return mode;
};

export default onCallbackQuery;
