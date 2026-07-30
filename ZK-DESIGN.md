# Zero-knowledge шифрування `data` (PRF) — дизайн

Гілка: `feature/zero-knowledge-data`. Мета: секрети (`vault_items.data`)
шифруються/дешифруються **лише в браузері**; сервер зберігає непрозорий blob і
**ніколи не має ключа**. Метадані (`title`, `type`, `folder_id`, `favorite`,
`require_reauth`, дати) лишаються plaintext → серверний пошук/папки/фільтри
працюють без змін.

## Ключова схема

- **VMK** (Vault Master Key) — випадковий 256-бітний AES-GCM ключ. Плейнтекстом
  існує тільки в пам'яті браузера (non-extractable `CryptoKey`). Ним шифрується
  кожен `data`.
- **PRF salt** — випадкові 32 байти на користувача, **не секрет**, зберігається
  на сервері (`users.prf_salt`). Потрібен стабільний, щоб PRF був детермінований.
- **Per-credential (кожен passkey):**
  - `P` = PRF-output passkey (assertion з `prf.eval.first = prf_salt`).
  - `KEK` = HKDF-SHA256(`P`, info=`"vault-kek-v1"`) → 256-бітний AES-GCM ключ.
  - `wrappedVMK` = AES-GCM(`KEK`, `VMK`, iv=random). Зберігається на сервері по
    одному на credential (`vault_credential_keys`).
- **Item blob** (`vault_items.data`, тепер opaque):
  `{ v:1, iv, ct }` (base64), де `ct` = AES-GCM(`VMK`, JSON(fields), iv=random),
  **AAD = item id** (щоб не можна було підмінити шифротекст між записами).

## Флоу

**Ініціалізація ZK (перший раз):**
1. Клієнт має розблоковану сесію (залогінений по passkey).
2. Сервер генерує/віддає `prf_salt` (якщо ще нема).
3. Клієнт робить assertion з `prf.eval.first = prf_salt` → `P` → `KEK`.
4. Клієнт генерує `VMK`, обгортає `KEK`-ом → `wrappedVMK`, шле на сервер.

**Розблокування (кожна сесія / per-item re-auth):**
`assertion(prf) → P → KEK → unwrap(wrappedVMK) → VMK` у пам'ять. Auto-lock чистить.

**Читання item:** `GET` віддає blob → клієнт `AES-GCM(VMK)` розшифровує.
**Запис item:** клієнт шифрує `data` під `VMK` → шле blob; сервер зберігає як є.

**Додати пристрій (новий passkey):** лише з **уже розблокованого** — після
реєстрації нового passkey клієнт бере його PRF → `KEK'` → обгортає поточний
`VMK` → зберігає `wrappedVMK` для нового credential.

**Recovery (окрема фаза, але обов'язкова до релізу):** recovery-код →
Argon2id(code, salt) → `KEK_r` → ще одна копія `wrappedVMK`. Інакше втрата всіх
пристроїв = втрата даних. Fallback і на випадок, коли PRF недоступний.

## Схема БД (додатки)

- `users.prf_salt` — string (base64), nullable. Ставиться раз при ZK-ініціалізації.
- `vault_credential_keys` — обгорнутий VMK на кожен passkey:
  `webauthn_credential_id` (FK→`webauthn_credentials.id`, cascade),
  `wrapped_vmk` (text), `wrap_iv`, `scheme` (`prf-v1`), unique(credential).
- `vault_items.data` — стає **opaque** (client blob). Знімаємо `encrypted:array`
  cast (сервер більше не шифрує/не читає). Версія формату — всередині blob (`v`).

## API (планово)

- `GET /encryption/bootstrap` → `{ prf_salt, wrapped_vmk|null }` для поточного
  passkey (чи є що розгортати).
- `POST /encryption/vmk` → зберегти `wrappedVMK` для поточного credential
  (init або додавання пристрою).
- Items: `data` у create/update приймається як blob і повертається як є.

## Наслідки / межі

- Сервер бачить **метадані** (назви, типи, папки, дати) — свідомий компроміс
  заради пошуку. Повний ZK (шифрування title) — окреме рішення на потім.
- **Health dashboard** (breach/reused/weak) стає **обов'язково клієнтським**.
- Вроджений ліміт веб-ZK: сервер віддає JS, що робить крипту → «trust the served
  JS»; XSS у ZK-режимі краде ключ з пам'яті → CSP/санітизація критичні.
- **Міграція наявних items:** одноразово клієнт тягне plaintext (сервер ще вміє
  до вимкнення cast), перешифровує під VMK, вантажить blob.

## Крипто-примітиви

- AES-256-GCM (шифр + wrapping), унікальний IV на кожен запис, AAD=item id.
- HKDF-SHA256 (PRF→KEK). Argon2id (recovery, через WASM-libsodium).
- Ключі — non-extractable `CryptoKey`; ніколи не в localStorage; auto-lock.
- Версіонування схеми (`scheme`, blob `v`) для майбутньої ротації.

## Фази — статус

1. ✅ **Фундамент (backend):** `prf_salt`, `vault_credential_keys`.
2. ✅ **Bootstrap API:** зберегти/віддати `wrappedVMK`, віддати `prf_salt`.
3. ✅ **Клієнтська крипта:** PRF-assertion, HKDF, VMK gen/unwrap, blob encrypt/decrypt.
4. ✅ **Інтеграція items:** шифрування `data` перед save, розшифрування при перегляді/edit,
   банер Unlock, lock при логауті.
5. ✅ **Міграція** наявних items — клієнт перешифровує легасі-items під VMK при першому
   unlock. **Серверний `encrypted:array` cast лишено** (надлишкова, але нешкідлива для ZK
   додаткова обгортка над уже-зашифрованим blob; зняття cast — опційний харденінг далі).
6. ✅ **Recovery** — не Argon2id, а **високоентропійний випадковий recovery-ключ** (256-біт)
   → HKDF → wrap VMK (без потреби в WASM-libsodium). Показ ключа один раз; unlock-fallback.
7. ✅ **Мульти-девайс** — `prf` вмикається при створенні passkey; при додаванні пристрою VMK
   обгортається під його PRF; для наявних passkey — кнопка «Enable encryption».

### Опційний харденінг далі
- Зняти серверний `encrypted:array` (зробити `data` справді opaque) після повної міграції.
- AAD=item id у blob (зараз без AAD — анти-swap як окремий харденінг).
- Auto-lock за таймером бездіяльності.
