let currentPeriod = 'daily';
let chart;

document.addEventListener('DOMContentLoaded', () => {
  const statsDiv = document.getElementById('stats');
  const totalTimeDiv = document.getElementById('totalTime');
  const dailyBtn = document.getElementById('dailyBtn');
  const weeklyBtn = document.getElementById('weeklyBtn');
  const monthlyBtn = document.getElementById('monthlyBtn');
  const chartContainer = document.getElementById('chartContainer');
  const chartCanvas = document.getElementById('timeChart');
//   const optionsBtn = document.getElementById('optionsBtn');

  dailyBtn.addEventListener('click', () => updateStats('daily'));
  weeklyBtn.addEventListener('click', () => updateStats('weekly'));
  monthlyBtn.addEventListener('click', () => updateStats('monthly'));
//   optionsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

  function updateStats(period) {
    currentPeriod = period;
    dailyBtn.classList.toggle('active', period === 'daily');
    weeklyBtn.classList.toggle('active', period === 'weekly');
    monthlyBtn.classList.toggle('active', period === 'monthly');
    updateDisplay();
  }

  function updateDisplay() {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        const currentURL = tabs[0] && tabs[0].url ? new URL(tabs[0].url).hostname : '';
        
        chrome.storage.local.get(null, result => {
          const today = new Date().toISOString().split('T')[0];
          const thisWeek = getWeekNumber(new Date());
          const thisMonth = new Date().toISOString().slice(0, 7);
    
          let sitesData = [];
    
          for (const [url, data] of Object.entries(result)) {
            if (url === 'totalTime') continue;
    
            const time = data[currentPeriod][currentPeriod === 'daily' ? today : currentPeriod === 'weekly' ? thisWeek : thisMonth] || 0;
            sitesData.push({ url, time, data });
          }

        // Sort sites by time spent
        sitesData.sort((a, b) => b.time - a.time);

        let html = '<ul>';
        for (const site of sitesData) {
          html += `<li class="${site.url === currentURL ? 'active' : ''}" data-url="${site.url}">`;
          html += `<span><strong>${site.url}</strong><br>Time: ${formatTime(site.time)}</span>`;
          html += `<button class="remove-btn" data-url="${site.url}">Remove</button>`;
          html += '</li>';
        }
        html += '</ul>';
        
        statsDiv.innerHTML = html;

        const totalData = result.totalTime || { daily: {}, weekly: {}, monthly: {} };
        const totalDaily = totalData.daily[today] || 0;
        const totalWeekly = totalData.weekly[thisWeek] || 0;
        const totalMonthly = totalData.monthly[thisMonth] || 0;

        totalTimeDiv.innerHTML = `
          <strong>Total Time:</strong><br>
          Today: ${formatTime(totalDaily)}<br>
          This Week: ${formatTime(totalWeekly)}<br>
          This Month: ${formatTime(totalMonthly)}
        `;

        // Add click event listeners to site list items and remove buttons
        document.querySelectorAll('li').forEach(li => {
          li.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
              showChart(li.dataset.url);
            }
          });
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeSite(btn.dataset.url, sitesData.find(site => site.url === btn.dataset.url).data);
          });
        });
      });
    });
  }

  function showChart(url) {
    chartContainer.style.display = 'block';
    
    chrome.storage.local.get(url, result => {
      const data = result[url];
      const labels = [];
      const timeData = [];

      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        labels.push(dateString);
        timeData.push((data.daily[dateString] || 0) / 3600); // Convert to hours
      }

      if (chart) {
        chart.destroy();
      }

      chart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Time Spent (hours)',
            data: timeData,
            backgroundColor: '#e94560',
            borderColor: '#e94560',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Hours'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Date'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: `Time Spent on ${url} (Last 7 Days)`
            }
          }
        }
      });
    });
  }

  function removeSite(url, timeData) {
    chrome.runtime.sendMessage({ action: "removeSite", url: url, timeData: timeData }, (response) => {
      if (response && response.success) {
        updateDisplay();
      } else {
        console.error('Error removing site:', response ? response.error : 'Unknown error');
      }
    });
  }

  updateDisplay();
  setInterval(updateDisplay, 1000);
});

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}