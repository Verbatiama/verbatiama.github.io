async function fetchAndMergeCollections() {
    const collectionUrl = "https://raw.githubusercontent.com/Verbatiama/LegendaryCreatureCollectionStorage/main/collection.json";
    const fullCardsUrl = "https://raw.githubusercontent.com/Verbatiama/LegendaryCreatureCollectionStorage/main/FullCards.json";

    // Fetch both files in parallel
    const [collectionRes, fullCardsRes] = await Promise.all([
        fetch(collectionUrl),
        fetch(fullCardsUrl)
    ]);

    if (!collectionRes.ok || !fullCardsRes.ok) {
        throw new Error("Failed to fetch one or both resources");
    }

    const collection = await collectionRes.json();
    const fullCards = await fullCardsRes.json();

    // Use Map for fullCards
    const fullCardsMap = new Map();
    fullCards.forEach(card => {
        fullCardsMap.set(card.name, card);
    });

    // Merge collection with fullCards by Name
    const merged = collection.map(item => ({
        ...item,
        ...(fullCardsMap.get(item.Name) || {})
    }));

    return merged;
}

// Example usage:
fetchAndMergeCollections().then(mergedData => {
    console.log(mergedData);
}).catch(err => {
    console.error(err);
});

