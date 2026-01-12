import Database from "../storage/database";

const add = async (message) => {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await Database.create();
      await database.addMessage(message);
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
};

export default { add };
