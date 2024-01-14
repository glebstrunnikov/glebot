const onText = async (
  msg,
  bot,
  conn,
  mode,
  toDoBtns,
  displayToDos,
  openai,
  chatGptBtns
) => {
  const text = msg.text;
  const chat = msg.chat.id;
  const userId = msg.chat.id;

  if (text === "/start") {
    bot.sendMessage(chat, "Privet", toDoBtns);
    mode[chat] = "default";
    return mode;
  }

  let toDoList = await conn.query(
    `SELECT * FROM tasks WHERE user_id=${userId}`
  );

  switch (mode[chat]) {
    case undefined:
      mode[chat] = "default";
    // falls through
    case "toDoAddingItem":
      toDoList.push({ text: text });
      conn.query(
        `INSERT INTO tasks (user_id, text) VALUES('${userId}', '${text}')`
      );
      bot.sendMessage(
        chat,
        `Кайф, новый список дел:\n\n${displayToDos(toDoList)}`,
        toDoBtns
      );
      break;
    case "toDoDeletingItem":
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
        break;
      } else {
        bot.sendMessage(
          chat,
          `Так не пойдет, пришли число больше 0 и меньше ${
            toDoList.length + 1
          }\n\n${displayToDos(toDoList)}`
        );
        break;
      }
    case "toDoEditingItem": {
      if (!/^\d+\s.+$/.test(text)) {
        bot.sendMessage(
          chat,
          "Ты что-то напутал с форматом. Пришли номер дела, пробел и новую редакцию"
        );
        break;
      }
      const editText = text.replaceAll(/^.+?\s/g, "").trim();
      const editNo = text.replaceAll(/\s.*$/g, "").trim();
      if (Number(editNo) === 0) {
        bot.sendMessage(
          chat,
          "Номер дела не может быть равен нулю. Попробуй еще раз"
        );
        break;
      }
      if (editNo >= toDoList.length + 1) {
        bot.sendMessage(chat, "У тебя нет столько дел в списке");
        break;
      }
      conn.query(
        `UPDATE tasks SET text = '${editText}' WHERE id = ${
          toDoList[editNo - 1].id
        }`
      );
      toDoList[editNo - 1].text = editText;
      bot.sendMessage(
        chat,
        `Кайф, новый список дел:\n\n${displayToDos(toDoList)}`,
        toDoBtns
      );
      mode[chat] = "default";
      break;
    }
    case "writeChatGpt":
      if (text.trim() === "/exit") {
        bot.sendMessage(
          chat,
          "Окей, ты больше не разговариваешь с ChatGPT",
          toDoBtns
        );
        mode[chat] = "default";
        break;
      } else {
        bot.sendMessage(chat, "Сначала выбери, что ты хочешь", chatGptBtns);
        break;
      }
    case "writeChatGptNew": {
      if (text.trim() === "/exit") {
        bot.sendMessage(
          chat,
          "Окей, ты больше не разговариваешь с ChatGPT",
          toDoBtns
        );
        mode[chat] = "default";
        break;
      } else {
        const chatCompletion = await openai.chat.completions.create({
          messages: [{ role: "user", content: text }],
          model: "gpt-3.5-turbo",
        });

        const newHistory = JSON.stringify([
          { role: "user", content: text },
          {
            role: "assistant",
            content: chatCompletion.choices[0].message.content,
          },
        ]);
        await conn.query(`DELETE FROM history WHERE user_id=${chat}`);
        const insertQuery =
          "INSERT INTO history (user_id, history) VALUES (?, ?)";

        await conn.query(insertQuery, [chat, newHistory]);

        await bot.sendMessage(chat, chatCompletion.choices[0].message.content);
        mode[chat] = "writeChatGptContinue";
        break;
      }
    }

    case "writeChatGptContinue": {
      if (text.trim() === "/exit") {
        bot.sendMessage(
          chat,
          "Окей, ты больше не разговариваешь с ChatGPT",
          toDoBtns
        );
        mode[chat] = "default";
        break;
      } else {
        let history = await conn.query(
          `SELECT * FROM history WHERE user_id=${chat}`
        );
        history = JSON.parse(history[0].history);

        history.push({ role: "user", content: text });

        const chatCompletion = await openai.chat.completions.create({
          messages: history,
          model: "gpt-3.5-turbo",
        });

        history.push({
          role: "assistant",
          content: chatCompletion.choices[0].message.content,
        });
        history = JSON.stringify(history);

        await conn.query(`DELETE FROM history WHERE user_id=${chat}`);
        const insertQuery =
          "INSERT INTO history (user_id, history) VALUES (?, ?)";

        await conn.query(insertQuery, [chat, history]);

        await bot.sendMessage(chat, chatCompletion.choices[0].message.content);
        break;
      }
    }

    default:
      bot.sendMessage(chat, "Не понял");
      break;
  }

  return mode;
};

export default onText;
