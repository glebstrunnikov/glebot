const on_callback_query = async (
  msg,
  conn,
  mode,
  bot,
  toDoDisplay,
  toDoBtns
) => {
  const chatId = msg.message.chat.id;
  let toDoList = await conn.query(
    `SELECT * FROM tasks WHERE user_id=${chatId}`
  );

  if (msg.data === "showtodolist") {
    mode = "default";
    bot.sendMessage(chatId, toDoDisplay(toDoList), toDoBtns);
    return mode;
  }

  if (msg.data === "addtodoitem") {
    mode = "toDoAddingItem";
    bot.sendMessage(chatId, "Итак, дело:");
    return mode;
  }

  if (msg.data === "deletetodoitem" && toDoList.length > 0) {
    mode = "toDoDeletingItem";

    bot.sendMessage(
      chatId,
      "Дело под каким номером вы хотите удалить? Пришлите число"
    );
    return mode;
  }

  if (msg.data === "deletetodoitem" && toDoList.length === 0) {
    bot.sendMessage(chatId, "Дел в списке нет, что ты удалять собрался?");
    return mode;
  }

  if (msg.data === "writechatgpt") {
    bot.sendMessage(
      chatId,
      "Хорошо, напишите, о чем бы вы хотели спросить, я передам \n\nЧтобы выйти из режима диалога с ChatGPT, напишите /exit"
    );
    mode = "writeChatGpt";
    return mode;
  }
};

export default on_callback_query;
