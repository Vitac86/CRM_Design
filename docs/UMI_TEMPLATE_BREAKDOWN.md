# UMI Template Breakdown

## 1. Назначение документа

Этот документ фиксирует, как разложить `static-uikit` (статическая HTML5 + UIkit версия CRM) на шаблонный каркас UMI.CMS.

Ключевые принципы:
- `static-uikit` — источник верстки и структуры страниц, но не источник runtime-логики.
- UMI-интеграция должна строиться на переиспользуемом `layout` и `partials`.
- Sidebar/topbar/page shell нельзя копипастить в каждую страницу.
- React/Vite код из `src/` напрямую в UMI не переносится; переносится структура UI, контракты данных и сценарии.

## 2. Рекомендуемая структура шаблонов

Ниже рекомендуемая иерархия UMI-шаблонов (названия можно адаптировать под принятый нейминг проекта):

- `layout/base`
- `partials/sidebar`
- `partials/topbar`
- `partials/page-header`
- `partials/filter-panel`
- `partials/table`
- `partials/badge`
- `partials/card`
- `partials/detail-header`
- `partials/tabs`
- `partials/form-grid`
- `partials/action-row`
- `partials/split-view`
- `partials/empty-state`
- `partials/pagination`
- `pages/dashboard`
- `pages/subjects`
- `pages/subject-card`
- `pages/subject-register`
- `pages/contract-wizard`
- `pages/requests`
- `pages/compliance`
- `pages/compliance-card`
- `pages/middle-office-clients`
- `pages/middle-office-reports`
- `pages/depository`
- `pages/back-office`
- `pages/trading`
- `pages/trading-card`
- `pages/administration`
- `pages/archive`
- `pages/error`

Рекомендация по ответственности:
- `layout/base`: только общий каркас и подключения.
- `partials/*`: переиспользуемые блоки без привязки к одной странице.
- `pages/*`: orchestration (подключение partials + привязка данных страницы).

## 3. Base layout

Базовый layout должен быть единым для внутренних страниц CRM.

Состав `layout/base`:
1. `html/head`
   - meta-теги;
   - title (динамический);
   - подключение CSS.
2. `body`
   - общий `app-wrapper`;
   - `sidebar` partial;
   - `content-wrapper`;
   - `topbar` partial;
   - `main content` (вставка контентного шаблона страницы).
3. Подключение JS (в конце `body`).

Что обязательно выносится в общий layout:
- логотип;
- основное меню;
- глобальный поиск;
- user block;
- avatar;
- общий фон/контейнеры приложения;
- общие скрипты.

Таким образом каждая страница меняет только центральную часть (`main content`), а shell не дублируется.

## 4. Assets

Обязательные локальные assets для UMI:

- `static-uikit/assets/css/uikit.min.css`
- `static-uikit/assets/css/crm-static.css`
- `static-uikit/assets/js/uikit.min.js`
- `static-uikit/assets/js/uikit-icons.min.js`
- `static-uikit/assets/js/crm-static.js`
- `static-uikit/assets/brand/logo-full-ru-white.svg`
- `static-uikit/assets/fonts/**`

Правила:
- Использовать только локальные файлы.
- CDN не использовать.
- Пути в UMI адаптировать под фактический web-root/шаблонный каталог.
- Порядок подключения:
  - CSS: `uikit.min.css` → `crm-static.css`;
  - JS: `uikit.min.js` → `uikit-icons.min.js` → `crm-static.js`.

## 5. Sidebar partial

`partials/sidebar` — единый блок для всех страниц.

Что включает:
- группы меню;
- пункты внутри групп;
- active state текущего раздела;
- раскрытие/сворачивание групп;
- видимость пунктов по ролям/правам.

Целевая структура меню:
- **Фронт-офис**
  - Дашборд
  - Субъекты
  - Брок. деятельность
  - Дов. управление
  - Агенты
  - Архив
  - Поручения
  - Комплаенс
- **Мидл-офис**
  - Журнал клиентов
  - Журнал отправленных отчётов
- **Бэк-офис**
- **Трейдинг**
- **Депозитарий**
- **Администрирование**

Как определять active state:
- по текущему route/URI;
- поддержать alias-маршруты (пример: `/subjects`, `/subjects/{id}`, `/subjects/register` активируют «Субъекты»);
- для вложенных страниц подсвечивать родительский пункт и раскрывать группу.

Как учитывать права:
- пункты меню рендерить условно (по роли/permission code);
- недоступные разделы не показывать или показывать disabled (по принятой UX-политике).

## 6. Topbar partial

`partials/topbar` — общий верхний бар.

Содержимое:
- поле глобального поиска;
- пользовательский блок;
- роль пользователя;
- avatar;
- быстрые действия (опционально).

Требования:
- на первом этапе поиск может быть обычной формой submit;
- autocomplete/подсказки можно добавить позже;
- user block обязан брать данные текущего пользователя из UMI;
- предусмотреть mobile-поведение (сворачивание, вынос действий в меню/иконки).

## 7. Page header partial

`partials/page-header` — единый заголовок страницы.

Параметры:
- `title`;
- `subtitle` и/или breadcrumbs (опционально);
- набор actions справа.

Типовые actions:
- Добавить
- Экспорт
- Скачать
- Сохранить
- Прочие контекстные кнопки

Важно: actions должны быть параметризованы на уровне конкретной страницы (а не зашиты в partial).

## 8. Filter panel partial

`partials/filter-panel` — типовой блок фильтрации.

Состав:
- search input;
- select-фильтры;
- date-фильтры;
- кнопка reset;
- кнопка export (когда нужна).

Интеграционные правила:
- фильтры передавать через GET-параметры или AJAX (по странице);
- reset должен очищать параметры и возвращать базовый набор данных;
- UI фильтров должен быть единым между реестрами.

## 9. Table partial

`partials/table` — общий table wrapper.

Что покрывает:
- header columns;
- rows;
- badges/status chips;
- row click;
- sort indicators;
- empty state;
- pagination.

Требования к данным:
- таблицы генерируются из данных UMI;
- demo-строки из `static-uikit` заменяются серверными циклами;
- row click ведет на карточку сущности или detail-view.

## 10. Badge/status partial

`partials/badge` — единая система статусов.

Базовые цвета:
- green
- blue
- yellow
- red
- gray

Примеры значений, которые должны маппиться в единый badge-слой:
- Активный клиент
- Пройден
- На проверке
- На комплаенсе
- На доработке
- Заблокирован
- Принято
- Ожидает
- Отклонено
- Да
- Нет
- Частично

Все статусные подписи и цвета должны маппиться из справочников/кодов UMI, а не задаваться вручную в HTML каждой страницы.

## 11. Card/detail partials

Набор для карточек и детальных представлений:
- `partials/card` (`crm-card`-контейнер);
- `partials/detail-header`;
- `partials/info-grid` (если нужен отдельный partial);
- `partials/tabs`;
- `partials/right-panel`;
- `partials/decision-panel`.

Где используются:
- `subject-card`;
- `compliance-card`;
- `trading-card`;
- split-view отчётов;
- карточки/панели администрирования.

## 12. Form partials

Рекомендуемые partials для форм:
- `partials/form-grid`;
- `partials/form-field` (label + control);
- `partials/form-select`;
- `partials/form-date`;
- `partials/form-textarea`;
- `partials/yes-no-toggle`;
- `partials/option-cards`;
- `partials/action-row`.

Где используются:
- `subject-register`;
- `contract-wizard`;
- `requests`;
- `compliance-card`.

Требование: единая сетка, spacing и поведение контролов во всех формах.

## 13. Split-view partial

`partials/split-view` для сценариев «список + детали».

Содержимое:
- список слева;
- детали справа;
- selected state;
- контекстные actions.

Где использовать:
- `middle-office-reports`;
- `depository`;
- потенциально `back-office`.

## 14. Mapping static pages to UMI templates

| Static page | UMI template | Common layout | Нужные partials | Данные из UMI |
|---|---|---|---|---|
| `dashboard.html` | `pages/dashboard` | Да | `sidebar`, `topbar`, `page-header`, `card`, `table` | KPI-счетчики, последние изменения, последние поручения |
| `subjects.html` | `pages/subjects` | Да | `sidebar`, `topbar`, `page-header`, `filter-panel`, `table`, `badge`, `pagination` | Список субъектов, фильтры, сортировка, пагинация, права на действия |
| `subject-card.html` | `pages/subject-card` | Да | `sidebar`, `topbar`, `page-header`, `detail-header`, `tabs`, `card`, `badge`, `action-row` | Профиль субъекта, статусы, вкладки, связанные сущности, доступные действия |
| `subject-register.html` | `pages/subject-register` | Да | `sidebar`, `topbar`, `page-header`, `form-grid`, `yes-no-toggle`, `option-cards`, `action-row` | Данные шагов регистрации, справочники, валидация, сохранение черновика |
| `requests.html` | `pages/requests` | Да | `sidebar`, `topbar`, `page-header`, `filter-panel`, `table`, `badge`, `form-grid`, `action-row` | Реестр поручений, форма создания/редактирования, статусы, фильтры |
| `compliance.html` | `pages/compliance` | Да | `sidebar`, `topbar`, `page-header`, `filter-panel`, `table`, `badge`, `pagination` | Очередь комплаенса, статусы проверок, фильтры, пагинация |
| `compliance-card.html` | `pages/compliance-card` | Да | `sidebar`, `topbar`, `page-header`, `detail-header`, `tabs`, `decision-panel`, `badge`, `action-row` | Карточка проверки, документы, решения, комментарии, права согласования |
| `middle-office-clients.html` | `pages/middle-office-clients` | Да | `sidebar`, `topbar`, `page-header`, `filter-panel`, `table`, `badge`, `pagination` | Журнал клиентов, договоры/счета, фильтры, экспорт |
| `middle-office-reports.html` | `pages/middle-office-reports` | Да | `sidebar`, `topbar`, `page-header`, `filter-panel`, `split-view`, `badge`, `action-row` | Список отчётов, выбранный отчет, статусы доставки, повторная отправка |
| `depository.html` | `pages/depository` | Да | `sidebar`, `topbar`, `page-header`, `filter-panel`, `split-view`, `badge`, `action-row` | Депозитарные отчёты, каналы доставки, скачивание, resend |
| `back-office.html` | `pages/back-office` | Да | `sidebar`, `topbar`, `page-header`, `filter-panel`, `table`/`split-view`, `badge` | Реестр отчетов бэк-офиса, статусы, фильтры, действия |
| `trading.html` | `pages/trading` | Да | `sidebar`, `topbar`, `page-header`, `filter-panel`, `table`, `badge`, `pagination` | Список trading-клиентов, фильтры, статусы, действия |
| `trading-card.html` | `pages/trading-card` | Да | `sidebar`, `topbar`, `page-header`, `detail-header`, `tabs`, `card`, `badge`, `action-row` | Профиль трейдинга, терминалы, параметры доступа, распоряжения |
| `administration.html` | `pages/administration` | Да | `sidebar`, `topbar`, `page-header`, `card`, `table` (по подпроектам) | Пользователи, роли, справочники, аудит, права на админ-действия |
| `archive.html` | `pages/archive` | Да | `sidebar`, `topbar`, `page-header`, `filter-panel`, `table`, `badge`, `pagination` | Архивные сущности, фильтры, восстановление/просмотр |
| `error.html` | `pages/error` (или `layout/error`) | Частично (упрощенно) | `topbar` (опц.), `card`/`empty-state` | Код ошибки, текст, целевой редирект, служебный идентификатор |

## 15. UMI variables / dynamic placeholders

Ниже блоки, которые должны стать динамическими (через переменные/условия/циклы UMI):

- текущий пользователь;
- роль пользователя;
- активный пункт меню;
- список строк таблицы;
- фильтры и их выбранные значения;
- статусы и badges;
- данные карточки клиента/сущности;
- набор кнопок по правам доступа;
- счетчики dashboard;
- список событий;
- отчёты;
- поручения.

Принцип замены:
- demo-текст и demo-значения из static-страниц заменяются на переменные;
- повторяющиеся блоки строк/карточек заменяются циклами;
- кнопки и секции зависят от прав и состояния сущности.

## 16. Recommended integration order

Рекомендуемый порядок внедрения:
1. Подключить assets.
2. Собрать `base layout`.
3. Вынести `sidebar/topbar` в partials.
4. Перенести `dashboard`.
5. Перенести `subjects`.
6. Перенести `subject-card`.
7. Перенести `requests/compliance`.
8. Перенести `middle-office/back-office/depository/trading`.
9. Перенести `administration/archive/error`.
10. Подключить реальные данные и действия (submit, permissions, статусы, экспорт, переходы).

## 17. Checklist for developers

- [ ] assets подключены локально;
- [ ] шрифты загружаются корректно;
- [ ] sidebar реализован одним общим partial;
- [ ] topbar реализован одним общим partial;
- [ ] active menu корректно работает для вложенных роутов;
- [ ] page title/actions параметризованы;
- [ ] таблицы получают данные из UMI, а не из demo-разметки;
- [ ] статусы маппятся через единый слой (`badge/status`);
- [ ] формы отправляются и обрабатывают ошибки;
- [ ] фильтры работают (GET/AJAX, reset);
- [ ] не используется CDN;
- [ ] нет копипаста layout по страницам;
- [ ] выполнена responsive sanity-проверка (desktop/tablet/mobile).

## 18. Risks and notes

Основные риски:
- Если копировать HTML-страницы целиком, поддержка и изменения станут дорогими.
- Если оставить demo data, интерфейс будет «выглядеть готовым», но бизнес-процессы не заработают.
- Если не унифицировать badges/statuses, статусы быстро разойдутся между разделами.
- Если заранее не зафиксировать routes и поля данных, интеграция заметно затянется.
- React-логику и SPA-паттерны нельзя напрямую вставлять в UMI-шаблоны.

Практическая заметка:
- сначала стабилизировать общий каркас (`layout + sidebar + topbar + shared partials`),
- затем подключать страницы по приоритету,
- и только после этого расширять интерактивность и оптимизировать UX.
