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

let leftPage = 0;
let rightPage = 1;
// Fetch and store merged cards on load
fetchAndMergeCollections().then(data => {
    fillCurrentPages(data);
});

function updatePageNumbers() {
    if (leftPage % 40 == 1) {
        leftPage = 1;
        rightPage = 2;
    }
    document.getElementById('left-page-number').textContent = leftPage;
    document.getElementById('right-page-number').textContent = rightPage;
}

function fillCardImage(page, position, imageUrl, owned) {
    const pageId = page === "left" ? "left-page" : "right-page";
    const pageElement = document.getElementById(pageId);
    const cardSlots = pageElement.getElementsByClassName("card-slot");
    if (position < 0 || position >= cardSlots.length) return;
    const filterStyle = owned === 0 ? 'filter: grayscale(100%) brightness(0.6);' : '';
    cardSlots[position].innerHTML = `<img src="${imageUrl}" alt="Card" style="width: 100%;height: 100%;${filterStyle}">`;
}

function retrieveCardImage(card) {
    if (card.image_uris && card.image_uris.large) {
        return { url: card.image_uris.large, owned: card.Owned };
    } else if (card.card_faces) {
        for (const face of card.card_faces) {
            if (face.type_line && face.type_line.includes("Legendary") && face.type_line.includes("Creature") && face.image_uris.large) {
                return { url: face.image_uris.large, owned: card.Owned };
            }
        }
    }
    return null;
}

function fillCurrentPages(mergedCards) {
    // Filter cards for left and right pages
    const leftCards = mergedCards.filter(card => card.Page == leftPage);
    const rightCards = mergedCards.filter(card => card.Page == rightPage);

    // Prepare arrays for slots (9 per page)
    const leftImages = Array(9).fill(null);
    leftCards.forEach(card => {
        leftImages[card.Slot - 1] = retrieveCardImage(card);
    });

    const rightImages = Array(9).fill(null);
    rightCards.forEach(card => {
        rightImages[card.Slot - 1] = retrieveCardImage(card);
    });

    // If left page is blank, fill with placeholders
    if (leftPage == 0) {
        for (let i = 0; i < 9; i++) {
            document.getElementById("left-page").getElementsByClassName("card-slot")[i].innerHTML =
                '<div class="card-placeholder">Blank</div>';
        }
    }
    else {
        // Fill left page
        for (let i = 0; i < leftImages.length; i++) {
            if (leftImages[i]) {
                fillCardImage("left", i, leftImages[i].url, leftImages[i].owned);
            } else {
                document.getElementById("left-page").getElementsByClassName("card-slot")[i].innerHTML =
                    '<div class="card-placeholder">Error</div>';
            }
        }
    }
    // Fill right page
    for (let i = 0; i < rightImages.length; i++) {
        if (rightImages[i]) {
            fillCardImage("right", i, rightImages[i].url, rightImages[i].owned);
        } else {
            document.getElementById("right-page").getElementsByClassName("card-slot")[i].innerHTML =
                '<div class="card-placeholder">Error</div>';
        }
    }
}

function changePage(delta) {
    if (leftPage + delta < 0) return;
    leftPage += delta;
    rightPage += delta;
    updatePageNumbers();
    fetchAndMergeCollections().then(data => {
        fillCurrentPages(data);
    });
}

function jumpToPage() {
    const input = document.getElementById('jump-page-input');
    let page = parseInt(input.value, 10);
    if (isNaN(page) || page < 1) return;
    if (page % 2 == 0) {
        leftPage = page;
        rightPage = page + 1;
    } else {
        leftPage = page - 1;
        rightPage = page;
    }
    updatePageNumbers();
    fetchAndMergeCollections().then(data => {
        fillCurrentPages(data);
    });
}