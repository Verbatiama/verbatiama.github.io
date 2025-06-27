function displayCocktail(data) {
    const cardCountElement = document.getElementById("currentCards");
    cardCountElement.innerHTML = "Current cards " + data.length;
    const tableBody = document.getElementById("apiTable");
    tableBody.innerHTML = "";
    const row = tableBody.insertRow();
    sortableRow(row.insertCell(), "Name");
    sortableRow(row.insertCell(), "Owned");
    sortableRow(row.insertCell(), "Price", true);
    sortableRow(row.insertCell(), "Book", true);
    sortableRow(row.insertCell(), "Page", true);
    sortableRow(row.insertCell(), "Slot", true);

    data.forEach((item) => {
        const row = tableBody.insertRow();
        cell = row.insertCell()
        cell.textContent = item.Name;
        setEventListeners(cell);
        row.insertCell().textContent = item.Owned;
        row.insertCell().textContent = item.Price;
        row.insertCell().textContent = item.Book;
        row.insertCell().textContent = item.Page;
        row.insertCell().textContent = item.Slot;
    });

}

let lastSortedColumn = null;
let lastSortDirection = 1; // 1 for ascending, -1 for descending

function sortableRow(row, name, isNumeric = false) {
    row.textContent = name;
    row.onclick = function () {
        // Toggle sort direction if the same column, otherwise reset to ascending
        if (lastSortedColumn === name) {
            lastSortDirection *= -1;
        } else {
            lastSortedColumn = name;
            lastSortDirection = 1;
        }
        fetchData(displayCocktail, null, (a, b) => {
            if (isNumeric) {
                const numA = parseFloat(a[name].toString().replace('$', ''));
                const numB = parseFloat(b[name].toString().replace('$', ''));
                return (numA - numB) * lastSortDirection;
            }
            return a[name].trim().localeCompare(b[name].trim()) * lastSortDirection;
        });
    };
}

let isMouseDown = false;

function setEventListeners(cell) {

    // Handle mouse events
    cell.addEventListener("mousedown", (e) => {
        isMouseDown = true;
        cell.classList.toggle("selected");
        e.preventDefault();
    });

    cell.addEventListener("mouseenter", () => {
        if (isMouseDown) {
            cell.classList.toggle("selected");
        }
    });

    cell.addEventListener("mouseup", () => {
        isMouseDown = false;
    });

    // Touch Events (mobile)
    cell.addEventListener("touchstart", (e) => {
        isSelecting = true;
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        toggleSelect(target);
    });

    cell.addEventListener("touchmove", (e) => {
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        toggleSelect(target);
    });

    cell.addEventListener("touchend", () => {
        isSelecting = false;
    });

}

function copySelectedText() {
    const selectedCells = document.querySelectorAll(".selected");
    const text = Array.from(selectedCells)
        .map(cell => cell.textContent)
        .join('\n');

    navigator.clipboard.writeText(text).then(() => {
        alert("Copied: " + text);
    }).catch(err => {
        console.error("Failed to copy: ", err);
    });
}

let lastFilterFunction = null;
let lastSortFunction = null;

function fetchData(resultFunction, filterFunction = null, sortFunction = null) {
    // Update the stored filter/sort if new ones are provided
    if (filterFunction !== null) lastFilterFunction = filterFunction;
    if (sortFunction !== null) lastSortFunction = sortFunction;

    const effectiveFilter = filterFunction !== null ? filterFunction : lastFilterFunction;
    const effectiveSort = sortFunction !== null ? sortFunction : lastSortFunction;

    fetch("https://raw.githubusercontent.com/Verbatiama/LegendaryCreatureCollectionStorage/main/collection.json")
        .then((response) => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error("NETWORK RESPONSE ERROR");
            }
        })
        .then((data) => {
            if (effectiveFilter) {
                data = data.filter(effectiveFilter);
            }
            if (effectiveSort) {
                data = data.sort(effectiveSort);
            }

            resultFunction(data); // Call the function to display the data
        })
        .catch((error) => console.error("FETCH ERROR:", error));

}

fetchData(displayCocktail)

document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault(); // Prevent default browser behavior
        copySelectedText();
    }
});

document.addEventListener("touchend", () => {
    isSelecting = false;
});

document.addEventListener("DOMContentLoaded", fetchData(function (data) {
    Highcharts.chart('pie-chart-container1', {
        chart: {
            type: 'pie'
        },
        title: {
            text: 'Collection Quantity'
        },
        tooltip: {
            pointFormat: '{series.name}: <b>{point.y}</b>'
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '{point.name}: {point.y}'
                }
            }
        },
        series: [{
            name: 'Share',
            colorByPoint: true,
            data: [
                { name: 'Owned', y: data.reduce((sum, item) => sum + item.Owned, 0), color: '#DA70D6' },
                { name: 'Unowned', y: data.length - data.reduce((sum, item) => sum + item.Owned, 0), color: '#FF6F61' }
            ]
        }]
    });
}));

document.addEventListener("DOMContentLoaded", fetchData(function (data) {
    Highcharts.chart('pie-chart-container2', {
        chart: {
            type: 'pie'
        },
        title: {
            text: 'Collection value (USD)'
        },
        tooltip: {
            pointFormat: '{series.name}: <b>${point.y:.2f}</b>'
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '{point.name}: ${point.y:.2f}'
                }
            }
        },
        series: [{
            name: 'Share',
            colorByPoint: true,
            data: [
                { name: 'Owned', y: data.filter(item => item.Owned == 1).map(item => Number(item.Price.replace("$", ""))).reduce((sum, price) => sum + price, 0), color: '#D2042D' },
                { name: 'Unowned', y: data.filter(item => item.Owned == 0).map(item => Number(item.Price.replace("$", ""))).reduce((sum, price) => sum + price, 0), color: ' #4169E1' }
            ]
        }]
    });
}));