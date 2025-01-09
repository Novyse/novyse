import localforage from "localforage";

const isBrowser = typeof window !== "undefined";

class LocalDatabase {
  constructor() {
    this.db = null;
    this.initializeDatabase();
  }

  async initializeDatabase() {
    if (isBrowser) {
      this.db = localforage.createInstance({ name: "db", storeName: "store" });
      console.log("Web DB init.");
    } else {
      try {
        const SQLite = require("expo-sqlite");
        this.db = SQLite.openDatabase("db.sqlite");
        console.log("Native DB init.");
      } catch (error) {
        console.warn("Using mock DB due to SQLite error:", error);
        this.db = { transaction: (cb) => cb({ executeSql: () => {} }) };
      }
    }
    await this.createTables();
  }

  async createTables() {
    if (isBrowser) return;
    const tableDefs = [
      "localUser (user_id TEXT, apiKey TEXT PRIMARY KEY, user_email TEXT, handle TEXT, name TEXT, surname TEXT)",
      "chats (chat_id TEXT PRIMARY KEY, group_channel_name TEXT)",
      "users (handle TEXT PRIMARY KEY)",
      "messages (message_id TEXT, chat_id TEXT, sender TEXT, text TEXT, date_time TEXT, hash TEXT)",
      "chat_users (chat_id TEXT, handle TEXT, PRIMARY KEY (chat_id, handle), FOREIGN KEY (chat_id) REFERENCES chats(chat_id), FOREIGN KEY (handle) REFERENCES users(handle))",
    ];
    await new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tableDefs.forEach((def) =>
          tx.executeSql(`CREATE TABLE IF NOT EXISTS ${def}`)
        );
        resolve();
      }, reject);
    });
  }

  async clearDatabase() {
    if (isBrowser) {
      try {
        // Clear all stores in the localForage instance
        await this.db.clear();
        console.log("Database cleared successfully.");
      } catch (error) {
        console.error("Error clearing localForage database:", error);
      }
    } else {
      try {
        await new Promise((resolve, reject) => {
          this.db.transaction((tx) => {
            tx.executeSql("DROP TABLE IF EXISTS localUser");
            tx.executeSql("DROP TABLE IF EXISTS chats");
            tx.executeSql("DROP TABLE IF EXISTS users");
            tx.executeSql("DROP TABLE IF EXISTS messages");
            tx.executeSql("DROP TABLE IF EXISTS chat_users");
            resolve();
          }, reject);
        });

        // Recreate tables
        await this.createTables();
        console.log("Database cleared and tables recreated successfully.");
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
    if (isBrowser) {
      const items = (await this.db.getItem(table)) || [];
      return (
        items.find((item) =>
          args.every((arg, i) => item[Object.keys(item)[i]] === arg)
        ) || null
      );
    } else {
      return new Promise((resolve, reject) => {
        this.db.transaction((tx) => {
          tx.executeSql(
            `SELECT ${columns.join(",")} FROM ${table} ${
              where ? "WHERE " + where : ""
            }`,
            args,
            (_, { rows }) => resolve(rows.length > 0 ? rows.item(0) : null),
            reject
          );
        });
      });
    }
  }

  async getTableData(table, columns = "*", where = "", args = [], extra = "") {
    if (isBrowser) {
      let items = (await this.db.getItem(table)) || [];

      if (where) {
        const whereParts = where.split("=");
        if (whereParts.length === 2) {
          const key = whereParts[0].trim();
          const value = args[0];
          items = items.filter((item) => item[key] === value);
        }
      }

      if (extra.includes("ORDER BY")) {
        const orderByCol = extra.match(/ORDER BY (\w+)/)[1];
        items.sort((a, b) => b[orderByCol] - a[orderByCol]);
      }

      if (extra.includes("LIMIT 1")) {
        items = items.slice(0, 1);
      }

      return items;
    }
  }

  async insertOrReplace(table, values) {
    if (isBrowser) {
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
      await new Promise((resolve, reject) => {
        this.db.transaction((tx) => {
          tx.executeSql(
            `INSERT OR REPLACE INTO ${table} (${keys.join(
              ","
            )}) VALUES (${placeholders})`,
            Object.values(values),
            resolve,
            reject
          );
        });
      });
    }
  }

  async insertOrIgnore(table, values) {
    if (isBrowser) {
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
      await new Promise((resolve, reject) => {
        this.db.transaction((tx) => {
          tx.executeSql(
            `INSERT OR IGNORE INTO ${table} (${keys.join(
              ","
            )}) VALUES (${placeholders})`,
            Object.values(values),
            resolve,
            reject
          );
        });
      });
    }
  }

  async update(table, values, where, args = []) {
    if (isBrowser) {
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

      await new Promise((resolve, reject) => {
        this.db.transaction((tx) => {
          tx.executeSql(
            `UPDATE ${table} SET ${setters} WHERE ${where}`,
            [...Object.values(values), ...args],
            (_, result) => {
              if (result.rowsAffected > 0) {
                // Here you need to fetch the updated item since SQLite doesn't return the updated row directly
                this.getRowData(table, Object.keys(values), where, args)
                  .then((item) => {
                    if (item) {
                      console.log("Updated item:", item);
                    }
                    resolve();
                  })
                  .catch(reject);
              } else {
                console.log("No item was updated matching the criteria.");
                resolve();
              }
            },
            reject
          );
        });
      });
    }
  }

  async checkDatabaseExistence() {
    if (isBrowser) {
      const keys = await this.db.keys();
      return keys.length > 0;
    } else {
      return new Promise((resolve) => {
        this.db.transaction(
          () => resolve(true),
          () => resolve(false)
        );
      });
    }
  }

  // Application-specific methods
  async fetchLocalUserID() {
    console.log(this.getSingleValue("localUser", "user_id"));
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
    const messages = await this.getTableData(
      "messages",
      "*",
      "chat_id = ?",
      [chat_id],
      "ORDER BY message_id DESC LIMIT 1"
    );

    return messages.length > 0 ? messages[0] : null;
  }
  async fetchAllChatMessages(chat_id) {
    return this.getTableData("messages", "*", "chat_id = ?", [chat_id]);
  }











  async searchMessageByHash(hash) {

    console.log("---Searching for message with hash:", hash);
    hash = hash.toString();
    const message = await this.getRowData(
      "messages",
      ["*"], // Select all columns of the message
      "hash = ?",
      [hash]
    );
  
    if (message) {
      console.log("---Message found with hash:", hash, "Message details:", message);
    } else {
      console.log("---No message found with hash:", hash);
    }
  
    return message;
  }










  async insertLocalUser(user_id, apiKey) {
    await this.insertOrReplace("localUser", { user_id, apiKey });
  }
  async updateLocalUser(user_email, handle, name, surname) {
    await this.update(
      "localUser",
      { user_email, handle, name, surname },
      "1=1"
    );
  }
  async insertChat(chat_id, group_channel_name) {
    await this.insertOrReplace("chats", { chat_id, group_channel_name });
  }
  async insertMessage(message_id, chat_id, text, sender, date, hash) {
    if (isBrowser) {
      let items = (await this.db.getItem("messages")) || [];
      items.push({ message_id, chat_id, text, sender, date_time: date, hash });
      await this.db
        .setItem("messages", items)
        .catch((e) => console.error("Error inserting in localStorage:", e));
    } else {
      await new Promise((resolve, reject) => {
        this.db.transaction((tx) => {
          tx.executeSql(
            "INSERT INTO messages (message_id, chat_id, text, sender, date_time, hash) VALUES (?, ?, ?, ?, ?, ?)",
            [message_id, chat_id, text, sender, date, hash],
            (_, result) => {
              console.log("Insert successful:", result);
              resolve();
            },
            (_, error) => {
              console.error("Error inserting into database:", error);
              reject(error);
            }
          );
        });
      }).catch((e) => console.error("Transaction error:", e));
    }
  }
  async updateSendMessage(date, message_id, hash) {
    console.log("Attempting to update message with hash:", hash);
    const existingMessage = await this.getRowData(
      "messages",
      ["hash"],
      "hash = ?",
      [hash]
    );
    console.log(
      "Existing message hash:",
      existingMessage ? existingMessage.hash : "Not found"
    );

    // Use the update method with hash for identification but update both date_time and message_id
    await this.update(
      "messages",
      { date_time: date, message_id: message_id },
      "hash = ?",
      [hash]
    );

    const updatedMessage = await this.getRowData(
      "messages",
      ["hash", "message_id", "date_time"],
      "hash = ?",
      [hash]
    );
    console.log(
      "Updated message:",
      updatedMessage
        ? {
            hash: updatedMessage.hash,
            message_id: updatedMessage.message_id,
            date_time: updatedMessage.date_time,
          }
        : "Not updated"
    );
  }
  async insertUsers(handle) {
    await this.insertOrIgnore("users", { handle });
  }
  async insertChatAndUsers(chat_id, handle) {
    await this.insertOrReplace("chat_users", { chat_id, handle });
  }
}

export default LocalDatabase;
