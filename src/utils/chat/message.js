import Database from "../storage/database";
import queueManager from "./queueManager.js";

const add = async (message) => {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await Database.create();
      await database.addMessage(message);

      if (message.files && message.files.length > 0) {
        await queueManager.addInboundMessageJob(message);
      }
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
};

export default { add };
