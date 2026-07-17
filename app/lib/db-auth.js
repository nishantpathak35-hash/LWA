import { queryGet, queryRun } from './db.js';
import { initAuthCreds, BufferJSON, proto } from '@whiskeysockets/baileys';

export async function useDbAuthState() {
  const readData = async (key) => {
    try {
      const row = await queryGet(`SELECT value FROM whatsapp_session WHERE key = ?`, [key]);
      if (row && row.value) {
        return JSON.parse(row.value, BufferJSON.reviver);
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const writeData = async (key, value) => {
    try {
      const serialized = JSON.stringify(value, BufferJSON.replacer);
      await queryRun(
        `INSERT INTO whatsapp_session (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?`,
        [key, serialized, serialized]
      );
    } catch (e) {
      console.error('Failed to write auth data for key', key, e.message);
    }
  };

  const removeData = async (key) => {
    try {
      await queryRun(`DELETE FROM whatsapp_session WHERE key = ?`, [key]);
    } catch (e) {
      console.error('Failed to delete auth data for key', key, e.message);
    }
  };

  let creds = await readData('creds');
  if (!creds) {
    creds = initAuthCreds();
    await writeData('creds', creds);
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          for (const id of ids) {
            let value = await readData(`${type}-${id}`);
            if (value) {
              if (type === 'app-state-sync-key') {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            }
          }
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const type in data) {
            for (const id in data[type]) {
              const value = data[type][id];
              const key = `${type}-${id}`;
              if (value) {
                tasks.push(writeData(key, value));
              } else {
                tasks.push(removeData(key));
              }
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: async () => {
      await writeData('creds', creds);
    }
  };
}
