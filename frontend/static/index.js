document.addEventListener('DOMContentLoaded', () => {
    pieChart();
    barChart();
    const userElement = document.getElementById('userId');
    userElement.textContent = userId;
});

function pieChart() {
    const languagesCtx = document.getElementById('languagesChart').getContext('2d');
    return new Chart(languagesCtx, {
        type: 'pie',
        data: {
            labels: ['Python', 'JavaScript', 'Go'],
            datasets: [{
                label: 'Languages Used',
                data: [40, 35, 25],
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
            labels: ['Mon', 'Tue', 'Wed'],
            datasets: [
                {
                    label: 'Code Completion Request',
                    data: [10, 30, 20],
                    backgroundColor: '#ffdd59'
                },
                {
                    label: 'Code Refactor Request',
                    data: [5, 15, 25],
                    backgroundColor: '#ff3f34'
                },
                {
                    label: 'Documentation Generation Request',
                    data: [8, 20, 18],
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