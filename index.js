

function displayCocktail(data) {
    const cardCountElement = document.getElementById("currentCards");
    cardCountElement.innerHTML = "Current cards " + data.length;
    const tableBody = document.getElementById("apiTable");
    tableBody.innerHTML = "";
    const row = tableBody.insertRow();
    let currentRow = row.insertCell()
    currentRow.textContent = "Name";
    currentRow.onclick = function () { sortTable(0); };
    row.insertCell().textContent = "Owned";
    row.insertCell().textContent = "Price";
    row.insertCell().textContent = "Book";
    row.insertCell().textContent = "Page";
    row.insertCell().textContent = "Slot";

    data.forEach((item) => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = item.Name;
        row.insertCell().textContent = item.Owned;
        row.insertCell().textContent = item.Price;
        row.insertCell().textContent = item.Book;
        row.insertCell().textContent = item.Page;
        row.insertCell().textContent = item.Slot;
    });

}


function fetchData(resultFunction, filterFunction = null, sortFunction = null) {
    fetch("https://raw.githubusercontent.com/Verbatiama/LegendaryCreatureCollectionStorage/main/collection.json")
        .then((response) => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error("NETWORK RESPONSE ERROR");
            }
        })
        .then((data) => {
            if (filterFunction) {
                data = data.filter(filterFunction);
            }
            if (sortFunction) {
                data = data.sort(sortFunction);
            }

            resultFunction(data); // Call the function to display the data
        })
        .catch((error) => console.error("FETCH ERROR:", error));

}

function sortTable(n) {
    var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    table = document.getElementById("apiTable");
    console.log(table);
    switching = true;
    // Set the sorting direction to ascending:
    dir = "asc";
    /* Make a loop that will continue until
    no switching has been done: */
    while (switching) {
        // Start by saying: no switching is done:
        switching = false;
        rows = table.rows;
        /* Loop through all table rows (except the
        first, which contains table headers): */
        for (i = 1; i < (rows.length - 1); i++) {
            // Start by saying there should be no switching:
            shouldSwitch = false;
            /* Get the two elements you want to compare,
            one from current row and one from the next: */
            x = rows[i].getElementsByTagName("TD")[n];
            y = rows[i + 1].getElementsByTagName("TD")[n];
            /* Check if the two rows should switch place,
            based on the direction, asc or desc: */
            if (dir == "asc") {
                if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                    // If so, mark as a switch and break the loop:
                    shouldSwitch = true;
                    break;
                }
            } else if (dir == "desc") {
                if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                    // If so, mark as a switch and break the loop:
                    shouldSwitch = true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            /* If a switch has been marked, make the switch
            and mark that a switch has been done: */
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            // Each time a switch is done, increase this count by 1:
            switchcount++;
        } else {
            /* If no switching has been done AND the direction is "asc",
            set the direction to "desc" and run the while loop again. */
            if (switchcount == 0 && dir == "asc") {
                dir = "desc";
                switching = true;
            }
        }
    }
}

fetchData(displayCocktail)

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