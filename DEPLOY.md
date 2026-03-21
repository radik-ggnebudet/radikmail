# Деплой RadikMail на radik.works — пошаговая инструкция

Эта инструкция написана так, будто ты никогда раньше не деплоил серверные приложения.
Следуй по шагам строго по порядку — всё получится.

---

## Что у тебя должно быть

- [x] Домен `radik.works` (уже есть)
- [ ] VPS/сервер (Ubuntu 22.04 или 24.04) — если ещё нет, читай следующий раздел
- [ ] Доступ в интернет и терминал (на Windows — скачай [Windows Terminal](https://apps.microsoft.com/detail/9n0dx20hk701))

---

## Шаг 0. Получи сервер (если ещё нет)

Если сервер у тебя уже есть — пропусти этот шаг.

Рекомендую **Hetzner** (дёшево, быстро, в Европе):
1. Зайди на [hetzner.com](https://www.hetzner.com/cloud) → зарегистрируйся
2. Создай новый сервер:
   - **Локация:** Nuremberg или Helsinki
   - **OS:** Ubuntu 24.04
   - **Тип:** CX22 (2 CPU, 4GB RAM) — ~4€/мес, хватит за глаза
   - **SSH-ключ:** добавь свой (или создай пароль для root)
3. После создания ты получишь **IP-адрес** сервера. Запиши его — он понадобится.

> Альтернативы: DigitalOcean, Linode, Timeweb, Reg.ru VPS — всё подойдёт.
> **Важно:** Ubuntu 22.04 или 24.04, минимум 1GB RAM.

---

## Шаг 1. Настрой DNS (указываем домен на сервер)

Это нужно сделать **первым делом** — DNS распространяется по интернету до 24 часов.

### Где это делать?

Зайди в личный кабинет туда, где купил `radik.works` → найди раздел **DNS** или **Управление доменом**.

### Какие записи создать:

| Тип | Имя (Host) | Значение (Value)         | TTL  |
|-----|-----------|--------------------------|------|
| A   | `@`       | `IP_ТВОЕГО_СЕРВЕРА`      | 3600 |
| A   | `mail`    | `IP_ТВОЕГО_СЕРВЕРА`      | 3600 |
| MX  | `@`       | `mail.radik.works`       | 3600 | ← приоритет 10
| TXT | `@`       | `v=spf1 mx ~all`         | 3600 |

**Где взять IP сервера?** — в панели управления хостингом (Hetzner → твой сервер → поле IPv4).

> Запись `A @` — это `radik.works` (сайт)
> Запись `A mail` — это `mail.radik.works` (почтовый сервер)
> Запись `MX` — говорит всему интернету: «почту для radik.works отправляй на mail.radik.works»
> Запись `TXT SPF` — помогает письмам не попадать в спам

### Как проверить что DNS применился?

Подожди 10–30 минут, потом проверь на сайте [dnschecker.org](https://dnschecker.org):
- Введи `radik.works`, тип `A` — должен появиться твой IP
- Введи `radik.works`, тип `MX` — должен появиться `mail.radik.works`

Пока DNS не применился — продолжай настраивать сервер, это можно делать параллельно.

---

## Шаг 2. Подключись к серверу

На Windows открой **Windows Terminal** (или PowerShell), введи:

```bash
ssh root@IP_ТВОЕГО_СЕРВЕРА
```

Например: `ssh root@5.161.123.45`

Если попросит подтвердить — напиши `yes` и нажми Enter.
Введи пароль (или используй SSH-ключ).

Ты попал в командную строку сервера — теперь всё что ты вводишь — выполняется на сервере.

---

## Шаг 3. Установи Docker на сервер

Вводи команды по одной, дожидайся завершения каждой:

```bash
# Обновляем систему
apt update && apt upgrade -y

# Устанавливаем необходимые утилиты
apt install -y curl git ufw

# Устанавливаем Docker одной командой
curl -fsSL https://get.docker.com | sh

# Проверяем что Docker установился
docker --version
```

Должно вывести что-то вроде: `Docker version 26.1.3, build ...`

---

## Шаг 4. Настрой файрволл

```bash
# Разрешаем нужные порты
ufw allow 22    # SSH (чтобы не потерять доступ!)
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 25    # SMTP (входящая почта)

# Включаем файрволл
ufw enable
# Введи 'y' когда спросит

# Проверяем
ufw status
```

---

## Шаг 5. Загрузи проект на сервер

У тебя два варианта:

### Вариант А: через Git (рекомендую)

Сначала залей проект на GitHub (на своём компьютере):

```bash
# На своём компьютере, в папке radikmail:
git add .
git commit -m "initial"
git remote add origin https://github.com/ТВО_ИМЯ/radikmail.git
git push -u origin master
```

Потом на сервере:

```bash
cd /opt
git clone https://github.com/ТВО_ИМЯ/radikmail.git
cd radikmail
```

### Вариант Б: через scp (загрузить папку напрямую)

На своём компьютере (в Windows Terminal):

```bash
scp -r C:\Users\grigr\WebstormProjects\radikmail root@IP_СЕРВЕРА:/opt/radikmail
```

Потом на сервере:

```bash
cd /opt/radikmail
```

---

## Шаг 6. Создай файл `.env`

На сервере, в папке `/opt/radikmail`:

```bash
cp .env.example .env
nano .env
```

Откроется редактор. Измени эти строки:

```env
DOMAIN=mail.radik.works
JWT_SECRET=сюда_вставь_длинную_случайную_строку
SMTP_PORT=25
API_PORT=3000
DATA_DIR=/data
ADMIN_EMAIL=radik@radik.works
ADMIN_PASSWORD=придумай_хороший_пароль
```

**Как придумать JWT_SECRET?** Выполни эту команду и скопируй результат:
```bash
openssl rand -hex 32
```

**Сохранить файл в nano:** нажми `Ctrl+O` → Enter → `Ctrl+X`

### Про отправку писем (SMTP relay)

Порт 25 для исходящей почты **часто блокируют хостеры** (Hetzner, DigitalOcean и др.).
Это значит принимать письма ты сможешь, но отправлять — нет.

**Решение — бесплатный SMTP relay через Brevo:**

1. Зарегистрируйся на [brevo.com](https://www.brevo.com) (бесплатно, 300 писем/день)
2. Зайди в `SMTP & API` → `SMTP`
3. Скопируй логин и пароль SMTP
4. Добавь в `.env`:

```env
SMTP_RELAY_HOST=smtp-relay.brevo.com
SMTP_RELAY_PORT=587
SMTP_RELAY_USER=твой_логин_в_brevo
SMTP_RELAY_PASS=твой_smtp_пароль_из_brevo
```

> Если оставить `SMTP_RELAY_HOST=` пустым — будет попытка отправки напрямую.
> Скорее всего не сработает (хостеры блокируют порт 25 для исходящих).

---

## Шаг 7. Запусти проект

```bash
cd /opt/radikmail
docker compose up --build -d
```

Первый раз это займёт 3–7 минут — Docker скачивает образы и собирает проект.
Ты увидишь много текста — это нормально.

Проверь что всё запустилось:

```bash
docker compose ps
```

Должно быть что-то вроде:

```
NAME                  STATUS
radikmail-backend-1   Up
radikmail-frontend-1  Up
```

Смотреть логи если что-то пошло не так:

```bash
docker compose logs backend
docker compose logs frontend
```

---

## Шаг 8. Проверь что работает

Открой в браузере: `http://radik.works`

Должна появиться страница входа RadikMail.
Войди с данными из `.env` (`ADMIN_EMAIL` и `ADMIN_PASSWORD`).

---

## Шаг 9. Настрой HTTPS (SSL сертификат) — важно!

Без HTTPS браузер будет ругаться и пароль будет передаваться незашифрованно.

```bash
# Устанавливаем Certbot
apt install -y certbot

# Получаем сертификат (замени на свой email и домен)
certbot certonly --standalone -d radik.works -d mail.radik.works \
  --email ты@example.com --agree-tos --non-interactive
```

> **Важно:** перед этим убедись что DNS уже применился и `radik.works` указывает на IP сервера.

Сертификаты будут в `/etc/letsencrypt/live/radik.works/`.

Теперь обновим nginx.conf чтобы он использовал HTTPS.
На сервере в папке `/opt/radikmail` открой файл:

```bash
nano nginx.conf
```

Замени содержимое на:

```nginx
server {
    listen 80;
    server_name radik.works mail.radik.works;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name radik.works;

    ssl_certificate     /etc/letsencrypt/live/radik.works/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/radik.works/privkey.pem;

    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Сохрани (`Ctrl+O` → Enter → `Ctrl+X`).

Обнови `docker-compose.yml` чтобы nginx видел сертификаты.
Открой:

```bash
nano docker-compose.yml
```

В секции `frontend` найди `volumes:` и добавь строку:

```yaml
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro   # ← добавь эту строку
```

И порты:

```yaml
    ports:
      - "80:80"
      - "443:443"   # ← добавь эту строку
```

Перезапусти:

```bash
docker compose down
docker compose up -d
```

Теперь открой `https://radik.works` — должен работать с замком.

### Автообновление сертификата

Let's Encrypt сертификаты действуют 90 дней. Добавим автообновление:

```bash
crontab -e
```

Выбери редактор (обычно `1` — nano), добавь строку в конец файла:

```
0 3 * * * certbot renew --quiet && docker compose -f /opt/radikmail/docker-compose.yml restart frontend
```

Сохрани и выйди.

---

## Шаг 10. Проверь что почта принимается

Отправь письмо на `radik@radik.works` с любого Gmail/Яндекс.
Подожди пару минут, обнови страницу в RadikMail — письмо должно появиться.

### Если письма не приходят — проверь:

```bash
# Смотрим логи SMTP сервера
docker compose logs backend | grep SMTP
```

Возможные причины:
- **DNS ещё не применился** — подожди, иногда до 24 часов
- **Порт 25 закрыт на сервере** — `ufw status` должен показывать `25 ALLOW`
- **Хостер блокирует входящий 25** — уточни у поддержки хостинга (у Hetzner обычно открыт)

---

## Шаг 11. Добавь ещё пользователей (опционально)

Хочешь добавить `другой_пользователь@radik.works`? На сервере:

```bash
cd /opt/radikmail

# Временно измени ADMIN_EMAIL в .env на нового пользователя
nano .env
# Измени ADMIN_EMAIL=новый@radik.works и ADMIN_PASSWORD=его_пароль

# Запусти setup
docker compose exec backend node src/setup.js

# Верни обратно своего пользователя в .env если нужно
```

---

## Итог — чеклист

- [ ] Сервер Ubuntu получен, знаешь его IP
- [ ] DNS записи A, MX, TXT созданы и применились
- [ ] Docker установлен на сервере
- [ ] Файрволл настроен (22, 80, 443, 25)
- [ ] Проект загружен в `/opt/radikmail`
- [ ] `.env` заполнен (DOMAIN, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD)
- [ ] SMTP relay через Brevo настроен (для исходящих)
- [ ] `docker compose up --build -d` выполнен
- [ ] Сайт открывается на `http://radik.works`
- [ ] SSL сертификат получен, сайт работает на `https://radik.works`
- [ ] Тестовое письмо пришло во входящие

---

## Если что-то пошло не так

```bash
# Посмотреть все логи
docker compose logs

# Перезапустить
docker compose restart

# Полностью пересобрать
docker compose down && docker compose up --build -d

# Посмотреть что слушает порт 25
ss -tlnp | grep :25
```

---

## Кратко для тех кто хочет просто запустить

```bash
# На сервере:
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
ufw allow 22 80 443 25 && ufw enable

cd /opt && git clone ТВОЙ_РЕП && cd radikmail
cp .env.example .env && nano .env   # заполни
docker compose up --build -d
```
