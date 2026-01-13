import { useEffect, useState } from "react";
import Database from "@/src/utils/storage/database";

const useStorage = () => {

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

  const [usedStorage, setUsedStorage] = useState(0);
  const [totalStorage, setTotalStorage] = useState(null);

    useEffect(() => {
    const fetchStorageInfo = async () => {
        try {
            setLoading(true);
            setError(null);
            const database = await Database.create();
            const used = await database.file.get.totalSize();
            setUsedStorage(used);
        } catch (error) {
            console.error("Error fetching storage info:", error);
            setError(error);
        }finally{
            setLoading(false);
        }
    };

    fetchStorageInfo();
  }, []);

  return { loading, error, usedStorage, totalStorage };

};

export default useStorage;
