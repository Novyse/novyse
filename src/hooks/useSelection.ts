import { useState, useCallback } from "react";

const useSelection = <T = string>() => {
    const [selectedItems, setSelectedItems] = useState<T[]>([]);

    const isSelectionMode = selectedItems.length > 0;

    const toggleSelection = useCallback((item: T) => {
        setSelectedItems((current) =>
            current.includes(item)
                ? current.filter((i) => i !== item)
                : [...current, item]
        );
    }, []);

    const initiateSelection = useCallback((item: T) => {
        if (!selectedItems.includes(item)) {
            setSelectedItems([item]);
        }
    }, [selectedItems]);

    const clearSelection = useCallback(() => {
        setSelectedItems([]);
    }, []);

    return {
        selectedItems,
        isSelectionMode,
        toggleSelection,
        initiateSelection,
        clearSelection,
    };
};

export default useSelection;
