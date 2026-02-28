import database from "@/src/utils/storage/database";

const add = async (message) => {
  return new Promise(async (resolve, reject) => {
    try {
      await database.addMessage(message);
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
};
const addMultiple = async (messages) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (await database.message.addMultiple(messages)) {
        resolve(true);
      } else {
        reject(new Error("Failed to add multiple messages"));
      }
    } catch (error) {
      reject(error);
    }
  });
};

export default { add, addMultiple };
