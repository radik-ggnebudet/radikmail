const crypto = require('crypto');

/**
 * Защита эндпоинтов логина от брутфорса.
 *
 * - Трекинг неудачных попыток по IP
 * - Прогрессивная задержка ответа (1с → 2с → 4с → ... → 30с)
 * - Блокировка IP по порогам (10/20/50 попыток)
 * - Автоочистка записей каждые 10 минут
 */
class LoginProtection {
  constructor(name) {
    this.name = name;
    this.attempts = new Map();

    // Очистка устаревших записей каждые 10 минут
    this._cleanupTimer = setInterval(() => this._cleanup(), 10 * 60 * 1000);
    this._cleanupTimer.unref(); // не мешает процессу завершиться
  }

  /**
   * Проверяет, заблокирован ли IP.
   * @returns {{ blocked: boolean, retryAfterSec?: number }}
   */
  isBlocked(ip) {
    const record = this.attempts.get(ip);
    if (!record) return { blocked: false };

    const now = Date.now();

    // Блок истёк — сбрасываем
    if (record.blockedUntil && now >= record.blockedUntil) {
      record.blockedUntil = null;
      record.count = 0;
      record.firstAttempt = null;
      return { blocked: false };
    }

    if (record.blockedUntil) {
      const retryAfterSec = Math.ceil((record.blockedUntil - now) / 1000);
      return { blocked: true, retryAfterSec };
    }

    return { blocked: false };
  }

  /**
   * Фиксирует неудачную попытку входа.
   * @returns {{ delay: number, totalAttempts: number, blocked: boolean }}
   */
  recordFailure(ip) {
    const now = Date.now();
    let record = this.attempts.get(ip);

    if (!record) {
      record = { count: 0, firstAttempt: now, lastAttempt: now, blockedUntil: null };
      this.attempts.set(ip, record);
    }

    // Если первая попытка была больше часа назад и нет блока — сбрасываем счётчик
    if (record.firstAttempt && (now - record.firstAttempt) > 60 * 60 * 1000 && !record.blockedUntil) {
      record.count = 0;
      record.firstAttempt = now;
    }

    record.count++;
    record.lastAttempt = now;

    // Пороги блокировки
    if (record.count >= 50) {
      record.blockedUntil = now + 24 * 60 * 60 * 1000; // 24 часа
      console.log(`[SECURITY][${this.name}] IP ${ip} заблокирован на 24 часа (${record.count} попыток)`);
    } else if (record.count >= 20) {
      record.blockedUntil = now + 60 * 60 * 1000; // 1 час
      console.log(`[SECURITY][${this.name}] IP ${ip} заблокирован на 1 час (${record.count} попыток)`);
    } else if (record.count >= 10) {
      record.blockedUntil = now + 15 * 60 * 1000; // 15 минут
      console.log(`[SECURITY][${this.name}] IP ${ip} заблокирован на 15 минут (${record.count} попыток)`);
    }

    // Прогрессивная задержка: 1с, 2с, 4с, 8с, 16с, 30с (cap)
    const delay = Math.min(1000 * Math.pow(2, record.count - 1), 30000);

    return {
      delay,
      totalAttempts: record.count,
      blocked: !!record.blockedUntil,
    };
  }

  /**
   * Сбрасывает счётчик при успешном входе.
   */
  recordSuccess(ip) {
    this.attempts.delete(ip);
  }

  /**
   * Возвращает текущую задержку для IP (до ответа).
   */
  getDelay(ip) {
    const record = this.attempts.get(ip);
    if (!record || record.count === 0) return 0;
    return Math.min(1000 * Math.pow(2, record.count - 1), 30000);
  }

  /**
   * Удаляет устаревшие записи.
   */
  _cleanup() {
    const now = Date.now();
    const staleThreshold = 60 * 60 * 1000; // 1 час

    let cleaned = 0;
    for (const [ip, record] of this.attempts) {
      const blockExpired = !record.blockedUntil || now >= record.blockedUntil;
      const isStale = (now - record.lastAttempt) > staleThreshold;

      if (isStale && blockExpired) {
        this.attempts.delete(ip);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[SECURITY][${this.name}] Очищено ${cleaned} устаревших записей, осталось ${this.attempts.size}`);
    }
  }
}

/**
 * Timing-safe сравнение строк.
 * Хешируем обе стороны в SHA-256, чтобы получить буферы одинаковой длины,
 * затем сравниваем через crypto.timingSafeEqual.
 */
function timingSafeCompare(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Express middleware — проверяет блокировку IP перед обработкой запроса.
 * Если IP заблокирован — сразу отдаёт 403.
 */
function loginLimiter(protection) {
  return (req, res, next) => {
    const ip = req.ip;
    const { blocked, retryAfterSec } = protection.isBlocked(ip);

    if (blocked) {
      console.log(`[SECURITY][${protection.name}] Заблокированный IP ${ip} пытается войти (retry after ${retryAfterSec}с)`);
      res.set('Retry-After', String(retryAfterSec));
      return res.status(403).json({
        error: `Слишком много попыток. Попробуйте через ${Math.ceil(retryAfterSec / 60)} мин.`,
      });
    }

    next();
  };
}

/**
 * Утилита — задерживает ответ на указанное время (мс).
 * Используется для прогрессивной задержки после неудачного логина.
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Раздельные инстансы для пользовательского и админского логина
const userLoginProtection = new LoginProtection('USER_AUTH');
const adminLoginProtection = new LoginProtection('ADMIN_AUTH');

module.exports = {
  userLoginProtection,
  adminLoginProtection,
  timingSafeCompare,
  loginLimiter,
  delay,
};
