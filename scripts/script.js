/* КОНФИГ */
const preloaderWaitindTime = 1200;
const cardsOnPage = 5;
const BASE_URL = 'https://v-content.practicum-team.ru';
const endpoint = `${BASE_URL}/api/videos?pagination[pageSize]=${cardsOnPage}&`;
const requestTimeout = 5000;
const videoReadyTimeout = 8000;
const fallbackVideos = {
  results: [
    {
      id: 'fallback-1',
      city: 'Санкт-Петербург',
      description: 'Цветы на городском ветру',
      time_of_day: 'morning',
      video: {
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      },
      poster: { url: 'https://picsum.photos/seed/saint-petersburg/960/540' },
      thumbnail: { url: 'https://picsum.photos/seed/saint-petersburg/640/360' },
    },
    {
      id: 'fallback-2',
      city: 'Москва',
      description: 'Движение большого города',
      time_of_day: 'afternoon',
      video: { url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
      poster: { url: 'https://picsum.photos/seed/moscow/960/540' },
      thumbnail: { url: 'https://picsum.photos/seed/moscow/640/360' },
    },
    {
      id: 'fallback-3',
      city: 'Казань',
      description: 'Вечерняя прогулка',
      time_of_day: 'night',
      video: { url: 'https://media.w3.org/2010/05/sintel/trailer.mp4' },
      poster: { url: 'https://picsum.photos/seed/kazan/960/540' },
      thumbnail: { url: 'https://picsum.photos/seed/kazan/640/360' },
    },
    {
      id: 'fallback-4',
      city: 'Сочи',
      description: 'Город у моря',
      time_of_day: 'morning',
      video: {
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      },
      poster: { url: 'https://picsum.photos/seed/sochi/960/540' },
      thumbnail: { url: 'https://picsum.photos/seed/sochi/640/360' },
    },
    {
      id: 'fallback-5',
      city: 'Владивосток',
      description: 'Вид на далёкий горизонт',
      time_of_day: 'afternoon',
      video: { url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
      poster: { url: 'https://picsum.photos/seed/vladivostok/960/540' },
      thumbnail: { url: 'https://picsum.photos/seed/vladivostok/640/360' },
    },
  ],
  pagination: { page: 1, pageCount: 1 },
};

/* ЭЛЕМЕНТЫ СТРАНИЦЫ */
const cardsList = document.querySelector('.content__list');
const cardsContainer = document.querySelector('.content__list-container');
const videoContainer = document.querySelector('.result__video-container');
const videoElement = document.querySelector('.result__video');
const form = document.querySelector('form');

/* ТЕМПЛЕЙТЫ */
const cardTmp = document.querySelector('.cards-list-item-template');
const preloaderTmp = document.querySelector('.preloader-template');
const videoNotFoundTmp = document.querySelector('.error-template');
const moreButtonTmp = document.querySelector('.more-button-template');

/* МЕХАНИКА */

// Нужен для работы с переключателями
let cardsOnPageState = [];

// Первая загрузка ✅

showPreloader(preloaderTmp, videoContainer);
showPreloader(preloaderTmp, cardsContainer);
mainMechanics(endpoint);

// осуществляется поиск ✅
form.onsubmit = (e) => {
  e.preventDefault();

  cardsList.textContent = '';
  const buttonInDOM = cardsContainer.querySelector('.more-button');
  if (buttonInDOM) {
    buttonInDOM.remove();
  }

  [...videoContainer.children].forEach((el) => {
    el.className === 'error' && el.remove();
  });

  showPreloader(preloaderTmp, videoContainer);
  showPreloader(preloaderTmp, cardsContainer);

  const formData = serializeFormData(form);
  const requestUrl = generateFilterRequest(
    endpoint,
    formData.city,
    formData.timeArray
  );

  mainMechanics(requestUrl);
};

/* ФУНКЦИЯ, КОТОРАЯ ВСЕ ГЕНЕРИТ */

async function mainMechanics(endpoint) {
  try {
    const data = await fetchVideos(endpoint);
    cardsOnPageState = data.results;

    if (!data?.results?.[0]) {
      throw new Error('not-found');
    }

    appendCards({
      baseUrl: BASE_URL,
      dataArray: data.results,
      cardTmp,
      container: cardsList,
    });

    setVideo({
      baseUrl: BASE_URL,
      video: videoElement,
      videoUrl: data.results[0].video.url,
      posterUrl: data.results[0].poster.url,
    });
    document
      .querySelectorAll('.content__card-link')[0]
      .classList.add('content__card-link_current');
    await waitForReadyVideo(videoElement);
    await delay(preloaderWaitindTime);
    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsContainer, '.preloader');

    // Добавляем класс для стилизации скроллбара
    cardsContainer.classList.add('custom-scrollbar');

    chooseCurrentVideo({
      baseUrl: BASE_URL,
      videoData: cardsOnPageState,
      cardLinksSelector: '.content__card-link',
      currentLinkClassName: 'content__card-link_current',
      mainVideo: videoElement,
    });

    showMoreCards({
      dataArray: data,
      buttonTemplate: moreButtonTmp,
      cardsList,
      buttonSelector: '.more-button',
      initialEndpoint: endpoint,
      baseUrl: BASE_URL,
      cardTmp: cardTmp,
    });
  } catch (err) {
    if (err.message === 'not-found') {
      showError(videoContainer, videoNotFoundTmp, 'Нет подходящих видео =(');
    } else {
      showError(videoContainer, videoNotFoundTmp, 'Ошибка получения данных :(');
    }
    console.log(err);
    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsContainer, '.preloader');
  }
}

/* УТИЛИТЫ */

// Простой промис, чтобы легче ставить паузу ✅

async function delay(ms) {
  return await new Promise((resolve) => {
    return setTimeout(resolve, ms);
  });
}

// Промис, который резолвится, если видео целиком готово к проинрыванию без пауз

async function waitForReadyVideo(video) {
  return await new Promise((resolve) => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      resolve(true);
      return;
    }

    const finish = (isReady) => {
      clearTimeout(timer);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplaythrough', onReady);
      video.removeEventListener('error', onError);
      resolve(isReady);
    };
    const onReady = () => finish(true);
    const onError = () => finish(false);
    const timer = setTimeout(() => finish(false), videoReadyTimeout);

    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('canplaythrough', onReady, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

// Используем резервные данные, если учебный API временно недоступен.
async function fetchVideos(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('Учебный API недоступен, используются резервные данные.', error);
    return filterFallbackVideos(url);
  } finally {
    clearTimeout(timer);
  }
}

function filterFallbackVideos(url) {
  const searchParams = new URL(url).searchParams;
  const city = searchParams.get('filters[city][$containsi]')?.toLowerCase();
  const times = searchParams.getAll('filters[time_of_day][$eqi]');
  const results = fallbackVideos.results.filter((video) => {
    const matchesCity = !city || video.city.toLowerCase().includes(city);
    const matchesTime = !times.length || times.includes(video.time_of_day);
    return matchesCity && matchesTime;
  });

  return {
    results,
    pagination: { page: 1, pageCount: 1 },
  };
}

function resolveMediaUrl(baseUrl, mediaUrl) {
  return new URL(mediaUrl, baseUrl).href;
}

// Устанавливает прелоадер на время загрузки данных ✅
function showPreloader(tmp, parent) {
  const node = tmp.content.cloneNode(true);
  parent.append(node);
  console.log('показал прелоадер');
}

// Убирает прелоадер из DOM ✅
function removePreloader(parent, preloaderSelector) {
  const preloader = parent.querySelector(preloaderSelector);
  if (preloader) {
    preloader.remove();
  }

  console.log('убрал прелоадер');
}

// Добавляет карточки в контейнер, собирая их из данных API ✅
function appendCards({ baseUrl, dataArray, cardTmp, container }) {
  dataArray.forEach((el) => {
    const node = cardTmp.content.cloneNode(true);
    node.querySelector('a').setAttribute('id', el.id);
    node.querySelector('.content__video-card-title').textContent = el.city;
    node.querySelector('.content__video-card-description').textContent =
      el.description;
    node
      .querySelector('.content__video-card-thumbnail')
      .setAttribute('src', resolveMediaUrl(baseUrl, el.thumbnail.url));
    node
      .querySelector('.content__video-card-thumbnail')
      .setAttribute('alt', el.description);
    container.append(node);
  });
  console.log('Сгенерировал карточки');
}

// Устанавливет внужное видео в контейнер ✅
function setVideo({ baseUrl, video, videoUrl, posterUrl }) {
  video.setAttribute('src', resolveMediaUrl(baseUrl, videoUrl));
  video.setAttribute('poster', resolveMediaUrl(baseUrl, posterUrl));
  console.log('Подставил видео в основной блок');
}

// получает данные из формы и сериализует как надо ✅

function serializeFormData(form) {
  const city = form.querySelector('input[name="city"]');
  const checkboxes = form.querySelectorAll('input[name="time"]');
  const checkedValuesArray = [...checkboxes].reduce((acc, item) => {
    item.checked && acc.push(item.value);
    return acc;
  }, []);
  console.log('Собрал данные формы в объект');
  return {
    city: city.value,
    timeArray: checkedValuesArray,
  };
}

// Генерирует строку с фильтрами запросов в API в зависимости от данных из формы ✅
function generateFilterRequest(endpoint, city, timeArray) {
  if (city) {
    endpoint += `filters[city][$containsi]=${city}&`;
  }
  if (timeArray) {
    timeArray.forEach((timeslot) => {
      endpoint += `filters[time_of_day][$eqi]=${timeslot}&`;
    });
  }
  console.log('Сгенерировал строку адреса запроса в API из данных формы');
  return endpoint;
}

// переключает текущее видео ✅
function chooseCurrentVideo({
  baseUrl,
  videoData,
  cardLinksSelector,
  currentLinkClassName,
  mainVideo,
}) {
  const cardsList = document.querySelectorAll(cardLinksSelector);
  if (cardsList) {
    cardsList.forEach((item) => {
      item.onclick = async (e) => {
        e.preventDefault();
        cardsList.forEach((item) => {
          item.classList.remove(currentLinkClassName);
        });
        item.classList.add(currentLinkClassName);
        showPreloader(preloaderTmp, videoContainer);
        const vidoObj = videoData.find(
          (video) => String(video.id) === String(item.id)
        );
        setVideo({
          baseUrl,
          video: mainVideo,
          videoUrl: vidoObj.video.url,
          posterUrl: vidoObj.poster.url,
        });
        await waitForReadyVideo(mainVideo);
        await delay(preloaderWaitindTime);
        removePreloader(videoContainer, '.preloader');
        console.log('Переключил видео');
      };
    });
  }
}

// вывожу интерфейс, когда видео не найдено ✅
function showError(container, errorTemplate, errorMessage) {
  const node = errorTemplate.content.cloneNode(true);
  node.querySelector('.error__title').textContent = errorMessage;
  container.append(node);
  console.log('показал, ошибку');
}

// вывожу больше видео, если в пагинации больше страниц, чем показано

function showMoreCards({
  dataArray,
  buttonTemplate,
  cardsList,
  buttonSelector,
  initialEndpoint,
  baseUrl,
  cardTmp,
}) {
  if (dataArray.pagination.page === dataArray.pagination.pageCount) return;
  // добавить кнопку из темплейта в конец списка карточек
  const button = buttonTemplate.content.cloneNode(true);
  cardsContainer.append(button);
  // Выберем добавленный элемент по селектору и добавим слушатель клика
  const buttonInDOM = cardsContainer.querySelector(buttonSelector);
  buttonInDOM.addEventListener('click', async () => {
    // по клику запросим данные для следующей страницы
    let currentPage = dataArray.pagination.page;
    let urlToFetch = `${initialEndpoint}pagination[page]=${(currentPage += 1)}&`;
    try {
      let data = await (await fetch(urlToFetch)).json();
      buttonInDOM.remove();
      cardsOnPageState = cardsOnPageState.concat(data.results);
      appendCards({
        baseUrl,
        dataArray: data.results,
        cardTmp,
        container: cardsList,
      });
      chooseCurrentVideo({
        baseUrl: BASE_URL,
        videoData: cardsOnPageState,
        cardLinksSelector: '.content__card-link',
        currentLinkClassName: 'content__card-link_current',
        mainVideo: videoElement,
      });
      showMoreCards({
        dataArray: data,
        buttonTemplate,
        cardsList,
        buttonSelector,
        initialEndpoint,
        baseUrl,
        cardTmp,
      });
    } catch (err) {
      return err;
    }
  });
}
