import localforage from "localforage";
import eventEmitter from "./EventEmitter";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";
console.log("Platform:", Platform.OS);

let SQLite = null;

if (!isWeb) {
  SQLite = require("expo-sqlite");
}

class LocalDatabase {
  constructor() {
    this.db = null;
    this.initializeDatabase();
  }

  async initializeDatabase() {
    if (isWeb) {
      this.db = localforage.createInstance({ name: "db", storeName: "store" });
      console.log("Web DB init.");
    } else {
      try {
        const SQLite = require("expo-sqlite");
        this.db = await SQLite.openDatabaseAsync("db.sqlite");
        console.log("Native DB init.");
      } catch (error) {
        console.warn("Using mock DB due to SQLite error:", error);
        this.db = { transaction: (cb) => cb({ executeSql: () => {} }) };
      }
    }
    await this.createTables();
  }

  async createTables() {
    if (isWeb) return;
    // const tableDefs = [
    //   "localUser (user_id TEXT, apiKey TEXT PRIMARY KEY, user_email TEXT, handle TEXT, name TEXT, surname TEXT)",
    //   "chats (chat_id TEXT PRIMARY KEY, group_channel_name TEXT)",
    //   "users (handle TEXT PRIMARY KEY)",
    //   "messages (message_id TEXT, chat_id TEXT, sender TEXT, text TEXT, date_time TEXT, hash TEXT)",
    //   "chat_users (chat_id TEXT, handle TEXT, PRIMARY KEY (chat_id, handle), FOREIGN KEY (chat_id) REFERENCES chats(chat_id), FOREIGN KEY (handle) REFERENCES users(handle))",
    // ];
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS localUser (user_id TEXT PRIMARY KEY, user_email TEXT, handle TEXT, name TEXT, surname TEXT);
      CREATE TABLE IF NOT EXISTS chats (chat_id TEXT PRIMARY KEY, group_channel_name TEXT);
      CREATE TABLE IF NOT EXISTS users (handle TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS messages (message_id TEXT, chat_id TEXT, sender TEXT, text TEXT, date_time TEXT);
      CREATE TABLE IF NOT EXISTS chat_users (chat_id TEXT, handle TEXT, PRIMARY KEY (chat_id, handle), FOREIGN KEY (chat_id) REFERENCES chats(chat_id), FOREIGN KEY (handle) REFERENCES users(handle));
    `);

    // console.log(await this.db.getAllAsync("SELECT * FROM localUser"));
    // console.log(await this.db.getAllAsync("SELECT * FROM chats"));
    // console.log(await this.db.getAllAsync("SELECT * FROM users"));
    // console.log(await this.db.getAllAsync("SELECT * FROM messages"));
    // console.log(await this.db.getAllAsync("SELECT * FROM chat_users"));
  }

  async clearDatabase() {
    if (isWeb) {
      try {
        // Clear all stores in the localForage instance
        await this.db.clear();
        console.log("Database cleared successfully. 1");
      } catch (error) {
        console.error("Error clearing localForage database:", error);
      }
    } else {
      try {
        // Drop all tables in the SQLite database
        await this.db.execAsync(`
          DROP TABLE IF EXISTS localUser;
          DROP TABLE IF EXISTS chats;
          DROP TABLE IF EXISTS users;
          DROP TABLE IF EXISTS messages;
          DROP TABLE IF EXISTS chat_users;
        `);
        this.createTables();
        console.log("Database cleared successfully. 2");
      } catch (error) {
        console.error("Error clearing SQLite database:", error);
      }
    }
  }

  async getSingleValue(table, column, where = "", args = []) {
    const row = await this.getRowData(table, [column], where, args);
    return row ? row[column] : `${column} not found`;
  }

  async getRowData(table, columns, where = "", args = []) {
    if (isWeb) {
      const items = (await this.db.getItem(table)) || [];
      return (
        items.find((item) =>
          args.every((arg, i) => item[Object.keys(item)[i]] === arg)
        ) || null
      );
    } else {
      return await this.db.getFirstAsync(
        `
        SELECT ${columns.join(",")} FROM ${table} ${
          where ? "WHERE " + where : ""
        }`,
        args
      );

      // return new Promise((resolve, reject) => {
      //   this.db.transaction((tx) => {
      //     tx.executeSql(
      //       `SELECT ${columns.join(",")} FROM ${table} ${
      //         where ? "WHERE " + where : ""
      //       }`,
      //       args,
      //       (_, { rows }) => resolve(rows.length > 0 ? rows.item(0) : null),
      //       reject
      //     );
      //   });
      // });
    }
  }

  async getTableData(table, columns = "*", where = "", args = [], extra = "") {
    if (isWeb) {
      let items = (await this.db.getItem(table)) || [];

      if (where) {
        const whereParts = where.split("=");
        if (whereParts.length === 2) {
          const key = whereParts[0].trim();
          const value = args[0];
          items = items.filter((item) => item[key] === value);
        }
      }
      return items;
    } else {
      return await this.db.getAllAsync(
        `SELECT ${columns} FROM ${table} ${
          where ? "WHERE " + where : ""
        } ${extra}`,
        args
      );
    }
  }

  async insertOrReplace(table, values) {
    if (isWeb) {
      let items = (await this.db.getItem(table)) || [];
      const pk = Object.keys(values)[0];
      const index = items.findIndex((item) => item[pk] === values[pk]);
      if (index > -1) items[index] = { ...items[index], ...values };
      else items.push(values);
      await this.db.setItem(table, items);
    } else {
      const [keys, placeholders] = [
        Object.keys(values),
        Object.values(values)
          .map(() => "?")
          .join(","),
      ];

      await this.db.runAsync(
        `INSERT INTO ${table} (${keys.join(",")}) VALUES (${placeholders})`,
        Object.values(values)
      );
    }
  }

  async insertOrIgnore(table, values) {
    if (isWeb) {
      let items = (await this.db.getItem(table)) || [];
      const pk = Object.keys(values)[0];
      if (!items.find((item) => item[pk] === values[pk])) {
        items.push(values);
        await this.db.setItem(table, items);
      }
    } else {
      const [keys, placeholders] = [
        Object.keys(values),
        Object.values(values)
          .map(() => "?")
          .join(","),
      ];

      return await this.db.runAsync(
        `INSERT OR IGNORE INTO ${table} (${keys.join(
          ","
        )}) VALUES (${placeholders})`
      );

      // await new Promise((resolve, reject) => {
      //   this.db.transaction((tx) => {
      //     tx.executeSql(
      //       `INSERT OR IGNORE INTO ${table} (${keys.join(
      //         ","
      //       )}) VALUES (${placeholders})`,
      //       Object.values(values),
      //       resolve,
      //       reject
      //     );
      //   });
      // });
    }
  }

  async update(table, values, where, args = []) {
    if (isWeb) {
      let items = (await this.db.getItem(table)) || [];
      let updatedItem = null;

      items = items.map((item) => {
        if (args.every((arg, i) => item[Object.keys(values)[i]] === arg)) {
          updatedItem = { ...item, ...values };
          return updatedItem;
        }
        return item;
      });

      await this.db.setItem(table, items);

      if (updatedItem) {
        console.log("Updated item:", updatedItem);
      } else {
        console.log("No item was updated matching the criteria.");
      }
    } else {
      const setters = Object.keys(values)
        .map((key) => `${key} = ?`)
        .join(", ");

      return await this.db.runAsync(
        `UPDATE ${table} SET ${setters} WHERE ${where}`
      );
    }
  }

  async checkDatabaseExistence() {
    if (isWeb) {
      const keys = await this.db.keys();
      return keys.length > 0;
    } else {
      return await this.db.getAllAsync(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      // return new Promise((resolve) => {
      //   this.db.transaction(
      //     () => resolve(true),
      //     () => resolve(false)
      //   );
      // });
    }
  }

  // Application-specific methods
  async fetchLocalUserID() {
    return this.getSingleValue("localUser", "user_id");
  }
  async fetchLocalUserApiKey() {
    return this.getSingleValue("localUser", "apiKey");
  }
  async fetchLocalUserNameAndSurname() {
    const { name, surname } =
      (await this.getRowData("localUser", ["name", "surname"])) || {};
    return name && surname ? `${name} ${surname}` : "Name or surname not found";
  }
  async fetchLocalUserEmail() {
    return this.getSingleValue("localUser", "user_email");
  }
  async fetchLocalUserHandle() {
    return this.getSingleValue("localUser", "handle");
  }

  async fetchChats() {
    return this.getTableData("chats");
  }
  async fetchUser(chat_id) {
    return this.getSingleValue("chat_users", "handle", "chat_id = ?", [
      chat_id,
    ]);
  }
  async fetchLastMessage(chat_id) {
    if (isWeb) {
      // Per localForage, dobbiamo ordinare manualmente i messaggi
      const messages = await this.getTableData(
        "messages",
        "*",
        "chat_id = ?",
        [chat_id],
        ""
      );
      // Ordiniamo per data e ora in modo discendente, poi prendiamo l'ultimo elemento
      const sortedMessages = messages.sort((a, b) => {
        return new Date(b.date_time) - new Date(a.date_time);
      });

      const lastMessage = sortedMessages[0];

      if (lastMessage === undefined) {
        return "no messages found";
      }

      // non funzionava
      const chatid = lastMessage.chat_id;
      const text = lastMessage.text;
      const date = lastMessage.date_time;
      const data = { chatid, text, date };
      eventEmitter.emit("updateNewLastMessage", data);

      return sortedMessages.length > 0 ? lastMessage : null;
    } else {
      return await this.db.getFirstAsync(
        `
        SELECT * FROM messages WHERE chat_id = ? ORDER BY date_time DESC LIMIT 1;
        `,
        [chat_id]
      );
      // Per SQLite, modifichiamo la query per ordinare in modo discendente e LIMIT 1
      // return new Promise((resolve, reject) => {
      //   this.db.transaction((tx) => {
      //     tx.executeSql(
      //       `SELECT * FROM messages WHERE chat_id = ? ORDER BY date_time DESC LIMIT 1`,
      //       [chat_id],
      //       (_, { rows }) => resolve(rows.length > 0 ? rows.item(0) : null),
      //       (_, error) => reject(error)
      //     );
      //   });
      // });
    }
  }

  async fetchAllChatMessages(chat_id) {
    return this.getTableData("messages", "*", "chat_id = ?", [chat_id]);
  }

  async insertLocalUser(user_id, user_email, handle, name, surname) {
    await this.insertOrReplace("localUser", {
      user_id,
      user_email,
      handle,
      name,
      surname,
    });
  }

  // async updateLocalUser(user_email, handle, name, surname) {
  //   await this.update(
  //     "localUser",
  //     { user_email, handle, name, surname },
  //     "1 = 1"
  //   );
  // }

  async insertChat(chat_id, group_channel_name) {
    try {
      if (isWeb) {
        let items = (await this.db.getItem("chats")) || [];
        // Check if chat already exists
        const chatExists = items.some((item) => item.chat_id === chat_id);

        if (!chatExists) {
          items.push({ chat_id, group_channel_name });
          await this.db.setItem("chats", items);
          return false;
        } else {
          console.log("Chat already exists, skipping insertion");
          return true;
        }
      } else {
        // For SQLite, use INSERT OR IGNORE and check changes
        const result = await this.db.runAsync(
          `INSERT OR IGNORE INTO chats (chat_id, group_channel_name) VALUES (?, ?)`,
          [chat_id, group_channel_name]
        );

        const wasInserted = result.changes > 0;
        console.log(
          wasInserted
            ? "Chat inserted successfully"
            : "Chat already exists, skipping insertion"
        );
        return !wasInserted;
      }
    } catch (error) {
      console.error("Error inserting chat:", error);
      return true;
    }
  }

  async insertMessage(message_id, chat_id, text, sender, date) {
    try {
      if (isWeb) {
        
        let items = (await this.db.getItem("messages")) || [];
        // Check if message already exists
        const messageExists = items.some(
          (item) => item.message_id === message_id && item.chat_id === chat_id
        );

        if (!messageExists) {
          items.push({ message_id, chat_id, text, sender, date_time: date });
          await this.db.setItem("messages", items);
          return false;
        } else {
          console.log("Message already exists, skipping insertion");
          return true;
        }
      } else {
        // For SQLite, use INSERT OR IGNORE
        const result = await this.db.runAsync(
          `
          INSERT OR IGNORE INTO messages (message_id, chat_id, text, sender, date_time)
          SELECT ?, ?, ?, ?, ?
          WHERE NOT EXISTS (
            SELECT 1 FROM messages 
            WHERE message_id = ? AND chat_id = ?
          )
          `,
          [message_id, chat_id, text, sender, date, message_id, chat_id]
        );

        const wasInserted = result.changes > 0;
        if(wasInserted) {
          console.log("Message already exists, skipping insertion");
        }
        return !wasInserted;
      }
    } catch (error) {
      console.error("Error inserting message:", error);
      return true;
    }
  }

  async updateSendMessage(date, message_id, hash) {

    // const data = { date, message_id, hash };

    if (isWeb) {
      // Esegui un update mirato nel browser usando localForage
      const items = (await this.db.getItem("messages")) || [];
      const index = items.findIndex((item) => item.hash === hash.trim());
      if (index > -1) {
        items[index] = {
          ...items[index],
          date_time: date,
          message_id: message_id,
        };
        await this.db.setItem("messages", items);
        console.log("Updated message (browser):", items[index]);
      } else {
        console.log("Message with the given hash not found in browser.");
      }
    } else {
      await this.db.runAsync(
        `
        UPDATE messages SET date_time = ?, message_id = ? WHERE hash = ?
        `,
        [date, message_id, hash]
      );
    }
    // eventEmitter.emit("updateMessage", data);
  }

  async insertUsers(handle) {
    await this.insertOrIgnore("users", { handle });
  }
  async insertChatAndUsers(chat_id, handle) {
    await this.insertOrReplace("chat_users", { chat_id, handle });
  }
}

const localDatabase = new LocalDatabase();
export default localDatabase;
