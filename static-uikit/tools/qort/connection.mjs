import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const configFile = new URL('../../.env.qort.local', import.meta.url);
export function settings() {
  let local = {};
  try { local = parseEnv(readFileSync(configFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return { ...local, ...process.env };
}

export class ReferenceErrorResponse extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function withConnection(read) {
  const cfg = settings();
  if (!cfg.QORT_SERVER)
    throw new ReferenceErrorResponse(503, 'Укажите QORT_SERVER в static-uikit/.env.qort.local и повторите поиск.');
  if (!/^[\w.-]+(?:\\[\w$-]+)?(?:,\d{1,5})?$/.test(cfg.QORT_SERVER) ||
      (cfg.QORT_DATABASE || 'BACK_QORT_DB') !== 'BACK_QORT_DB' ||
      (cfg.QORT_TRUSTED_CONNECTION || 'true') !== 'true' ||
      !['true','false'].includes(cfg.QORT_TRUST_SERVER_CERTIFICATE || 'false'))
    throw new ReferenceErrorResponse(503, 'Проверьте параметры Windows-подключения в .env.qort.local.');
  const timeout = Number(cfg.QORT_QUERY_TIMEOUT_MS || 10000);
  if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 60000)
    throw new ReferenceErrorResponse(503, 'QORT_QUERY_TIMEOUT_MS должен быть от 1000 до 60000.');
  const connectionString = [
    'Driver={ODBC Driver 18 for SQL Server}', 'Server=' + cfg.QORT_SERVER, 'Database=BACK_QORT_DB',
    'Trusted_Connection=Yes', 'Encrypt=Yes', 'ApplicationIntent=ReadOnly',
    'TrustServerCertificate=' + (cfg.QORT_TRUST_SERVER_CERTIFICATE === 'true' ? 'Yes' : 'No')
  ].join(';');
  let sql;
  try { ({default: sql} = await import('msnodesqlv8')); }
  catch { throw new ReferenceErrorResponse(503, 'Не удалось загрузить драйвер msnodesqlv8. Установите зависимости проекта на Windows.'); }
  let conn;
  try {
    conn = await sql.promises.open({conn_str:connectionString, conn_timeout:Math.ceil(timeout / 1000)});
    const select = async (statement, params) => {
      const result = await conn.promises.query(statement, params, {timeoutMs:timeout});
      return result.first || [];
    };
    return await read(select, sql);
  } catch (error) {
    // Keep native diagnostics on the local console. The HTTP response contains no connection details.
    console.error('QORT:', error.message);
    throw new ReferenceErrorResponse(503, 'Не удалось прочитать QORT. Проверьте подключение Windows и повторите запрос.');
  } finally {
    if (conn) await conn.promises.close();
  }
}
