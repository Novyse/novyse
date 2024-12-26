import localforage from 'localforage';

const isBrowserEnvironment = typeof window !== 'undefined';

class LocalDatabase {
  constructor() {
    this.db = null;
    this.initializeDatabase();
  }

  async initializeDatabase() {
    if (isBrowserEnvironment) {
      this.db = localforage.createInstance({
        name: 'localDatabase',
        storeName: 'localStore',
      });
      console.log('Database initialized for Web. Using localForage.');
    } else {
      try {
        const SQLite = require('expo-sqlite');
        this.db = SQLite.openDatabase('localDatabase.db');
        console.log('Database initialized for Native. Using SQLite.');
      } catch (error) {
        console.warn("SQLite is not available. Using a mock database.", error);
        this.db = {
          transaction: (callback) => callback(
            {executeSql: () => {}}
          )
        };
      }
    }
    await this.databaseOpen();
  }

  async databaseOpen() {
    if (!this.db || !this.db.transaction) {
      console.warn("Database is not properly initialized.");
      return Promise.resolve();
    }
    if (isBrowserEnvironment) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        try {
          tx.executeSql(`CREATE TABLE IF NOT EXISTS localUser (user_id TEXT, apiKey TEXT PRIMARY KEY, user_email TEXT, handle TEXT, name TEXT, surname TEXT);`);
          tx.executeSql(`CREATE TABLE IF NOT EXISTS chats (chat_id TEXT PRIMARY KEY, group_channel_name TEXT);`);
          tx.executeSql(`CREATE TABLE IF NOT EXISTS users (handle TEXT PRIMARY KEY);`);
          tx.executeSql(`CREATE TABLE IF NOT EXISTS messages (message_id TEXT, chat_id TEXT REFERENCES chats(chat_id), sender TEXT, text TEXT, date_time TEXT, hash TEXT);`);
          tx.executeSql(`CREATE TABLE IF NOT EXISTS chat_users (chat_id TEXT, handle TEXT, PRIMARY KEY (chat_id, handle), FOREIGN KEY (chat_id) REFERENCES chats(chat_id), FOREIGN KEY (handle) REFERENCES users(handle));`);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, (_, error) => reject(error));
    });
  }

  async getSingleValue(tableName, columnName, whereClause = '', whereArgs = []) {
    const row = await this.getRowData(tableName, [columnName], whereClause, whereArgs);
    return row ? row[columnName] : `${columnName} not found`;
  }

  async getRowData(tableName, columns, whereClause = '', whereArgs = []) {
    if (isBrowserEnvironment) {
      const items = await this.db.getItem(tableName) || [];
      return items.find(item => whereArgs.every((arg, i) => item[Object.keys(item)[i]] === arg)) || null;
    } else {
      return new Promise((resolve, reject) => {
        this.db.transaction(tx => {
          tx.executeSql(`SELECT ${columns.join(', ')} FROM ${tableName} ${whereClause ? `WHERE ${whereClause}` : ''};`, whereArgs, (_, { rows }) => resolve(rows.length > 0 ? rows.item(0) : null), (_, error) => reject(error));
        });
      });
    }
  }

  async getTableData(tableName, columns = '*', whereClause = '', whereArgs = [], extraClauses = '') {
    if (isBrowserEnvironment) {
      return (await this.db.getItem(tableName)) || [];
    } else {
      return new Promise((resolve, reject) => {
        this.db.transaction(tx => {
          tx.executeSql(`SELECT ${columns} FROM ${tableName} ${whereClause ? `WHERE ${whereClause}` : ''} ${extraClauses};`, whereArgs, (_, { rows }) => resolve(rows._array || []), (_, error) => reject(error));
        });
      });
    }
  }

  async insertOrReplace(tableName, values) {
    if (isBrowserEnvironment) {
      let items = (await this.db.getItem(tableName)) || [];
      const primaryKey = Object.keys(values)[0];
      const itemIndex = items.findIndex(item => item[primaryKey] === values[primaryKey]);
      if (itemIndex > -1) {
        items[itemIndex] = { ...items[itemIndex], ...values };
      } else {
        items.push(values);
      }
      await this.db.setItem(tableName, items);
    } else {
      const keys = Object.keys(values);
      const placeholders = keys.map(() => '?').join(', ');
      const query = `INSERT OR REPLACE INTO <span class="math-inline">\{tableName\} \(</span>{keys.join(', ')}) VALUES (${placeholders});`;
      return new Promise((resolve, reject) => {
        this.db.transaction(tx => {
          tx.executeSql(query, Object.values(values), () => resolve(), (_, error) => reject(error));
        });
      });
    }
  }

    async insertOrIgnore(tableName, values) {
        if (isBrowserEnvironment) {
            let items = (await this.db.getItem(tableName)) || [];
            const primaryKey = Object.keys(values)[0];
            if (!items.find(item => item[primaryKey] === values[primaryKey])) {
                items.push(values);
                await this.db.setItem(tableName, items);
            }
        } else {
            const keys = Object.keys(values);
            const placeholders = keys.map(() => '?').join(', ');
            const query = `INSERT OR IGNORE INTO <span class="math-inline">\{tableName\} \(</span>{keys.join(', ')}) VALUES (${placeholders});`;

            return new Promise((resolve, reject) => {
                this.db.transaction(tx => {
                    tx.executeSql(query, Object.values(values), () => resolve(), (_, error) => reject(error));
                });
            });
        }
    }

  async update(tableName, values, whereClause, whereArgs = []) {
    if (isBrowserEnvironment) {
        let items = (await this.db.getItem(tableName)) || [];
        const updatedItems = items.map(item =>
            whereArgs.every((arg, i) => item[Object.keys(values)[i]] === arg) ? { ...item, ...values } : item
        );
        await this.db.setItem(tableName, updatedItems);
    } else {
      const keys = Object.keys(values);
      const setters = keys.map(key => `${key} = ?`).join(', ');
      const query = `UPDATE ${tableName} SET ${setters} WHERE ${whereClause};`;
      return new Promise((resolve, reject) => {
        this.db.transaction(tx => {
          tx.executeSql(query, [...Object.values(values), ...whereArgs], () => resolve(), (_, error) => reject(error));
        });
      });
    }
  }

    async checkDatabaseExistence() {
        if (isBrowserEnvironment) {
            const keys = await this.db.keys();
            return keys.length > 0;
        } else {
            if (this.db.transaction) {
                return new Promise((resolve) => {
                    this.db.transaction(
                        () => resolve(true),
                        () => resolve(false)
                    );
                });
            } else {
                console.warn("Cannot check database existence in this environment.");
                return Promise.resolve(false);
            }
        }
    }


  // Metodi specifici per l'applicazione (che usano i metodi generici)
  async fetchLocalUserID() { return this.getSingleValue('localUser', 'user_id'); }
  async fetchLocalUserApiKey() { return this.getSingleValue('localUser', 'apiKey'); }
  async fetchLocalUserNameAndSurname() {
    const result = await this.getRowData('localUser', ['name', 'surname']);
    return result ? `${result.name} ${result.surname}` : 'Name or surname not found';
  }
  async fetchLocalUserEmail() { return this.getSingleValue('localUser', 'user_email'); }
    async fetchLocalUserHandle() { return this.getSingleValue('localUser', 'handle'); }

  async fetchChats() { return this.getTableData('chats'); }
  async  fetchUser(chat_id) { return this.getTableData('chat_users', 'handle', 'chat_id = ?', [chat_id]); }
  async fetchLastMessage(chat_id) {
    return this.getTableData('messages', '*', 'chat_id = ?', [chat_id], 'ORDER BY message_id DESC LIMIT 1');
  }
  async fetchAllChatMessages(chat_id) { return this.getTableData('messages', '*', 'chat_id = ?', [chat_id]); }

  async insertLocalUser(user_id, apiKey) { await this.insertOrReplace('localUser', { user_id, apiKey }); }
  async updateLocalUser(user_email, handle, name, surname) { await this.update('localUser', { user_email, handle, name, surname }, '1 = 1'); }
  async insertChat(chat_id, group_channel_name) { await this.insertOrReplace('chats', { chat_id, group_channel_name }); }
  async insertMessage(message_id, chat_id, text, sender, date, hash) {
    await this.insertOrReplace('messages', { message_id, chat_id, text, sender, date_time: date, hash });
  }

  async updateSendMessage(date, message_id, hash) {
    await this.update('messages', { date_time: date, message_id, hash }, 'hash = ?', [hash]);
  }

    async insertUsers(handle) {
        await this.insertOrIgnore('users', { handle });
    }

  async insertChatAndUsers(chat_id, handle) {
    await this.insertOrReplace('chat_users', { chat_id, handle });
  }
}

export default LocalDatabase;