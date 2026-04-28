# PROJECT HEALTH CHECK

## Зачем нужен health check

`check:health` — это лёгкая регрессионная защита проекта без дополнительных зависимостей.
Скрипт помогает быстро отловить возврат проблем, которые уже закрывались cleanup-итерациями:

- нежелательные внешние runtime URL;
- прямые сетевые вызовы в `src`;
- скрытые Unicode/Bidi символы;
- debug-следы;
- хардкод маршрутов вне каталога маршрутов;
- потенциально theme-breaking utility-классы в `pages/components`.

Скрипт не меняет UI, бизнес-логику или данные — только валидирует текстовые файлы.

## Как запускать

```bash
npm run check:health
```

Скрипт расположен в `scripts/project-health-check.mjs` и использует только стандартные модули Node.js:

- `fs`
- `path`
- `process`

## Что считается fail

Health check завершится с кодом `1`, если найдены:

1. **External runtime URLs** в runtime-файлах (кроме `docs/*`), включая паттерны:
   - `http://`, `https://`, `fonts.googleapis`, `fonts.gstatic`, `googleapis`, `gstatic`, `cdn`, `unpkg`, `jsdelivr`, `cloudflare`, `firebase`, `analytics`, `gtag`, `tagmanager`, `maps`, `sentry`, `amplitude`, `mixpanel`.
   - Исключение: `http://www.w3.org/2000/svg` (harmless SVG namespace).
2. **Runtime network calls** в `src/*`:
   - `fetch(`, `axios`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon`.
3. **Hidden/Bidi Unicode**:
   - `U+202A..U+202E`, `U+2066..U+2069`, `U+200B`, `U+200C`, `U+200D`, `U+FEFF`.
4. **Debug leftovers**:
   - `debugger` (всегда fail);
   - `console.log`, `console.warn`, `console.error` (если не распознано как DEV-guard случай).

## Что считается warning

Проверка завершается успешно, но сообщает warning для:

1. **Ссылок в документации** (`docs/*`) по external URL паттернам.
2. **`console.error` в DEV-guard контексте** (`import.meta.env.DEV`).
3. **Hardcoded routes** (например, `"/dashboard"`, `"/subjects"` и т.д.) вне:
   - `src/routes/paths.ts`;
   - router config файлов (`*routes.ts`, `*routes.tsx`);
   - `tests/*`, `docs/*`.
4. **Theme-breaking hardcoded colors** в `src/pages/*` и `src/components/*`:
   - `bg-white`, `bg-slate-`, `bg-gray-`, `text-slate-`, `text-gray-`, `border-slate-`, `border-gray-`.

## Допустимые false positives

Некоторые совпадения могут быть легитимными:

- упоминания URL в документации;
- осознанные `console.error` в dev-only участках;
- строки маршрутов в поясняющем контексте;
- отдельные utility-классы, временно допустимые в визуальном слое.

В таких случаях предупреждение фиксируется как наблюдение и не блокирует сборку.

## Как аккуратно добавлять исключения

Если найден устойчивый false positive:

1. Подтвердите, что это действительно допустимый кейс и не регрессия.
2. Добавьте **минимально узкое** исключение в `scripts/project-health-check.mjs`:
   - ограничьте по конкретному файлу/директории;
   - ограничьте по конкретному паттерну;
   - не ослабляйте правило глобально без причины.
3. Обновите этот документ (`docs/PROJECT_HEALTH_CHECK.md`) с объяснением причины.

## Что проверить перед демонстрацией

1. `npm run check:health` — нет fail, warnings понятны и ожидаемы.
2. `npm run build` — production сборка проходит.
3. В PR перечислены:
   - какие warning остались;
   - почему они допустимы;
   - что не было UI/route/theme/form/data изменений.
