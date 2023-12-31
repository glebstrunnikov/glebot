import fetch from "node-fetch";

const onLocation = async (msg, weatherApiKey, bot, toDoBtns) => {
  async function getWeather(api, cnt) {
    return await fetch(
      `https://api.openweathermap.org/data/2.5/${api}?lat=${msg.location.latitude}&lon=${msg.location.longitude}&appid=${weatherApiKey}&units=metric${cnt}&lang=ru`
    );
  }

  let currentWeather = await getWeather("weather", "");
  let tomorrowWeather = await getWeather("forecast", "&cnt=8");
  currentWeather = await currentWeather.json();
  tomorrowWeather = await tomorrowWeather.json();

  let listOfWeatherConditions = [];
  tomorrowWeather.list.forEach((threeHourlyForecast) => {
    threeHourlyForecast.weather.forEach((weatherObject) => {
      if (listOfWeatherConditions.indexOf(weatherObject.description) === -1) {
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
  const weatherReport = `Температура сейчас: ${
    Math.floor(currentWeather.main.temp * 10) / 10
  }, ${currentWeather.weather[0].description} (ощущается как ${
    Math.floor(currentWeather.main.feels_like * 10) / 10
  })\n\nВ ближайшие сутки: от ${Math.floor(tomorrowTempMin * 10) / 10} до ${
    Math.floor(tomorrowTempMax * 10) / 10
  }, ${listOfWeatherConditions.join(", ")}`;
  bot.sendMessage(msg.chat.id, weatherReport, toDoBtns);
};

export default onLocation;
