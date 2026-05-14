import { SQLiteDatabase } from "expo-sqlite";

export class ProfileRepository {
  db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  setDb(db: SQLiteDatabase) {
    this.db = db;
  }

  name = {
    update: async (userUUID: any, name: any): Promise<boolean> => {
      try {
        if (!userUUID || !name) {
          console.error("Missing required fields to update user name.");
          return false;
        }
        const result: any = await this.db.runAsync(
          `UPDATE user SET name = ? WHERE uuid = ?;`,
          [name, userUUID],
        );
        if (result.changes > 0) {
          console.log("User name updated successfully:", userUUID);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error updating user name:", error);
        return false;
      }
    },
  };

  surname = {
    update: async (userUUID: any, surname: any): Promise<boolean> => {
      try {
        if (!userUUID || !surname) {
          console.error("Missing required fields to update user surname.");
          return false;
        }
        const result: any = await this.db.runAsync(
          `UPDATE user SET surname = ? WHERE uuid = ?;`,
          [surname, userUUID],
        );
        if (result.changes > 0) {
          console.log("User surname updated successfully:", userUUID);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error updating user surname:", error);
        return false;
      }
    },
  };

  biography = {
    update: async (userUUID: any, biography: any): Promise<boolean> => {
      try {
        if (!userUUID || !biography) {
          console.error("Missing required fields to update user biography.");
          return false;
        }
        const result: any = await this.db.runAsync(
          `UPDATE user SET biography = ? WHERE uuid = ?;`,
          [biography, userUUID],
        );
        if (result.changes > 0) {
          console.log("User biography updated successfully:", userUUID);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error updating user biography:", error);
        return false;
      }
    },
  };

  picture = {
    update: async (
      userUUID: any,
      profilePictureUUID: any,
    ): Promise<boolean> => {
      try {
        if (!userUUID || !profilePictureUUID) {
          console.error(
            "Missing required fields to update user profile picture.",
          );
          return false;
        }
        const result: any = await this.db.runAsync(
          `UPDATE user SET profilePictureUUID = ? WHERE uuid = ?;`,
          [profilePictureUUID, userUUID],
        );
        if (result.changes > 0) {
          console.log("User profile picture updated successfully:", userUUID);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error updating user profile picture:", error);
        return false;
      }
    },

    get: async (userUUID: any): Promise<any> => {
      try {
        const user: any = await this.db.getFirstAsync(
          `SELECT profilePictureUUID FROM user WHERE uuid = ?;`,
          [userUUID],
        );
        return user ? user.profilePictureUUID : null;
      } catch (error) {
        console.error("Error retrieving user profile picture:", error);
        return null;
      }
    },

    set: async (userUUID: any, pictureUUID: any): Promise<boolean> => {
      try {
        if (!userUUID || !pictureUUID) {
          console.error("Missing required fields to set user profile picture.");
          return false;
        }
        const result: any = await this.db.runAsync(
          `UPDATE user SET profilePictureUUID = ? WHERE uuid = ?;`,
          [pictureUUID, userUUID],
        );
        if (result.changes > 0) {
          console.log("User profile picture updated successfully:", userUUID);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error updating user profile picture:", error);
        return false;
      }
    },
  };

  birthday = {
    update: async (userUUID: any, birthday: any): Promise<boolean> => {
      try {
        if (!userUUID || !birthday) {
          console.error("Missing required fields to update user birthday.");
          return false;
        }
        const result: any = await this.db.runAsync(
          `UPDATE user SET birthday = ? WHERE uuid = ?;`,
          [birthday, userUUID],
        );
        if (result.changes > 0) {
          console.log("User birthday updated successfully:", userUUID);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error updating user birthday:", error);
        return false;
      }
    },
  };

  region = {
    update: async (userUUID: any, region: any): Promise<boolean> => {
      try {
        if (!userUUID || !region) {
          console.error("Missing required fields to update user region.");
          return false;
        }
        const result: any = await this.db.runAsync(
          `UPDATE user SET region = ? WHERE uuid = ?;`,
          [region, userUUID],
        );
        if (result.changes > 0) {
          console.log("User region updated successfully:", userUUID);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error updating user region:", error);
        return false;
      }
    },
  };

  country = {
    update: async (userUUID: any, country: any): Promise<boolean> => {
      try {
        if (!userUUID || !country) {
          console.error("Missing required fields to update user country.");
          return false;
        }
        const result: any = await this.db.runAsync(
          `UPDATE user SET country = ? WHERE uuid = ?;`,
          [country, userUUID],
        );
        if (result.changes > 0) {
          console.log("User country updated successfully:", userUUID);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error updating user country:", error);
        return false;
      }
    },
  };

  banner = {
    update: async (userUUID: any, bannerPictureUUID: any): Promise<boolean> => {
      try {
        if (!userUUID || !bannerPictureUUID) {
          console.error(
            "Missing required fields to update user banner picture.",
          );
          return false;
        }
        const result: any = await this.db.runAsync(
          `UPDATE user SET bannerPictureUUID = ? WHERE uuid = ?;`,
          [bannerPictureUUID, userUUID],
        );
        if (result.changes > 0) {
          console.log("User banner picture updated successfully:", userUUID);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error updating user banner picture:", error);
        return false;
      }
    },
  };

  color = {
    update: async (userUUID: any, color: any): Promise<boolean> => {
      try {
        if (!userUUID || !color) {
          console.error("Missing required fields to update user color.");
          return false;
        }
        const result: any = await this.db.runAsync(
          `UPDATE user SET color = ? WHERE uuid = ?;`,
          [color, userUUID],
        );
        if (result.changes > 0) {
          console.log("User color updated successfully:", userUUID);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error updating user color:", error);
        return false;
      }
    },
  };
}
