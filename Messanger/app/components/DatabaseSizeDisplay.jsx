import { useState, useEffect } from 'react';
import { Text } from 'react-native';
import localDatabase from '../utils/localDatabaseMethods';

const DatabaseSizeDisplay = () => {
  const [dbSize, setDbSize] = useState('0.00');

  const fetchDatabaseSize = async () => {
    const size = await localDatabase.getDatabaseSize();
    setDbSize(size);
  };

  useEffect(() => {
    fetchDatabaseSize();
  }, []);

  return (
    <Text>Dimensione database: {dbSize} MB</Text>
  );
};

export default DatabaseSizeDisplay;