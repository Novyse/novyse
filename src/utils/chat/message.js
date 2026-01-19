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

export default { add };
