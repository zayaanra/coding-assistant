document.addEventListener('DOMContentLoaded', () => {
    const userId = getUserId();
    if (userId === null || userId === "") {
        // TODO: Display error page
    } else {
        // Call the functions to render the charts
        pieChart();
        barChart();
        const userElement = document.getElementById('userId');
        userElement.textContent = getUserId();
    }
});

function pieChart() {
    const languagesCtx = document.getElementById('languagesChart').getContext('2d');
    return new Chart(languagesCtx, {
        type: 'pie',
        data: {
            labels: ['Python', 'JavaScript', 'Go'], // Replace with actual language labels
            datasets: [{
                label: 'Languages Used',
                data: [40, 35, 25], // Replace with actual usage data
                backgroundColor: ['#ffdd59', '#575fcf', '#ff3f34'],
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    enabled: true,
                }
            }
        }
    });
}

function barChart() {
    const requestsCtx = document.getElementById('requestsChart').getContext('2d');
    return new Chart(requestsCtx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed'], // Replace with actual labels (e.g., days)
            datasets: [
                {
                    label: 'Code Completion Request',
                    data: [10, 30, 20], // Replace with actual data
                    backgroundColor: '#ffdd59'
                },
                {
                    label: 'Code Refactor Request',
                    data: [5, 15, 25], // Replace with actual data
                    backgroundColor: '#ff3f34'
                },
                {
                    label: 'Documentation Generation Request',
                    data: [8, 20, 18], // Replace with actual data
                    backgroundColor: '#575fcf'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    enabled: true,
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Days'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Requests'
                    }
                }
            }
        }
    });
}

function getUserId() {
    // TODO: If user does not exist or user not allowed to access, show error document.

    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id')

    return params.get("id");
}