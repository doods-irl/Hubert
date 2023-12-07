const { ipcRenderer } = require('electron');

// Function to send a request to the main process for processed tasks
function requestProcessedTasks() {
  console.log("Renderer: Requesting Tasks");
  ipcRenderer.send('request-processed-tasks');
}

// Event listener for the response from the main process
ipcRenderer.on('processed-tasks-response', (event, tasks) => {
  console.log("Renderer: Receiving Tasks");
  processedTasks = tasks;
  updateTaskDisplay();
});

// Event listener for real-time updates
ipcRenderer.on('tasks-updated', async () => {
  console.log("Renderer: Notified that tasks were updated");
  requestProcessedTasks(); // Request updated tasks
});

function updateTaskDisplay() {
  let daysContainer = document.getElementById('days-container');
  daysContainer.innerHTML = ''; // Clear existing content
  generateMonthDays(); // Regenerate days with updated tasks
}

var selectedDate;

var processedTasks = {};

document.addEventListener('DOMContentLoaded', async () => {
  let currentDate = new Date();
  requestProcessedTasks();
  generateMonthDays();
  scrollToDate(currentDate);
});

function generateMonthDays() {
  let currentDate = new Date();
  let currentYear = currentDate.getFullYear();
  let currentMonth = currentDate.getMonth();
  let daysContainer = document.getElementById('days-container');

  let date = new Date(currentYear, currentMonth, 1);
  while (date.getMonth() === currentMonth) {
      let pageElement = createPageContainer(date);
      daysContainer.appendChild(pageElement);
      date.setDate(date.getDate() + 1);
  }
}

function createPageContainer(date) {
  let pageContainer = document.createElement('div');
  pageContainer.className = 'page-container';

  let dayElement = createDayElement(date);
  let laneContainer = createLaneContainer(date);

  pageContainer.appendChild(dayElement);
  pageContainer.appendChild(laneContainer);

  return pageContainer;
}

function scrollToDate(date) {
  selectedDate = date;
  // Manually format the date to ensure it's in local time
  const dateString = date.getFullYear() + '-' +
                     String(date.getMonth() + 1).padStart(2, '0') + '-' +
                     String(date.getDate()).padStart(2, '0');

  const currentDayElement = document.querySelector(`[data-date='${dateString}']`);
  console.log('current date: ', date);
  console.log('date string: ', dateString);
  console.log('current date element: ', currentDayElement);

  if (currentDayElement) {
    currentDayElement.scrollIntoView();
  }
}

function createLaneContainer(date) {
  if (!date) {
    console.error('createLaneContainer called without a date');
    return document.createElement('div');
  }

  // Format the date as YYYY-MM-DD
  const formattedDate = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');

  const laneContainer = document.createElement('div');
  laneContainer.className = 'lane-container';

  const lanes = ['daily', 'todo', 'reminder', 'alarm'];
  lanes.forEach(lane => {
    const laneDiv = document.createElement('div');
    laneDiv.id = lane;
    laneDiv.className = 'lane';

    const laneHeader = document.createElement('div');
    laneHeader.className = 'lane-header';
    laneHeader.innerHTML = `${lane.charAt(0).toUpperCase() + lane.slice(1)}`;

    const laneContent = document.createElement('div');
    laneContent.className = 'lane-content';

    laneDiv.appendChild(laneHeader);
    laneDiv.appendChild(laneContent);

    // Access the tasks for this lane
    const laneTasks = processedTasks[lane];
    if (laneTasks) {
      Object.keys(laneTasks).forEach(taskId => {
        const task = laneTasks[taskId];
        task.recurrences.forEach(recurrence => {
          if (recurrence.date === formattedDate && !recurrence.disabled && !recurrence.dismissed) {
            console.log(`Adding task to ${lane}:`, task, `Target date: ${formattedDate}`);
            const taskElement = document.createElement('div');
            taskElement.setAttribute('data-taskid', `${recurrence.recurrenceId}`);
            taskElement.setAttribute('data-tasktype', `${lane}`);
            taskElement.className = 'task';
            taskElement.innerHTML = `${task.title}<br>${task.time}`;
            taskElement.addEventListener('click', () => {
              markTaskAsCompleted(recurrence.recurrenceId, taskElement);
            });
            laneContent.appendChild(taskElement);
          }
        });
      });
    }
    laneContainer.appendChild(laneDiv);
  });

  return laneContainer;
}

function markTaskAsCompleted(recurrenceId, taskDiv) {
  fetch(`http://localhost:3000/complete-task/${recurrenceId}`, { method: 'DELETE' })
      .then(response => response.json())
      .then(data => {
        if (taskDiv) {
          const doneTick = document.createElement('div');
          doneTick.className = "doneTick";
          doneTick.innerHTML = '&#x2705;';
          taskDiv.appendChild(doneTick);
          taskDiv.style.transition = "height 0.3s, padding 0.3s, margin 0.3s";
          setTimeout(() => {
          taskDiv.style.height = "0px";
          taskDiv.style.padding = "0px 20px";
          taskDiv.style.margin = "0px 20px";
          }, 600);
          setTimeout(() => {taskDiv.remove();}, 2000);
        }
      })
      .catch(error => console.error('Error:', error));
  }

function createDayElement(date) {
  let dayElement = document.createElement('div');
  dayElement.className = 'day-container';
  
  let formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  dayElement.setAttribute('data-date', formattedDate); // Set a data attribute

  // Add day, date, month, and year information
  dayElement.innerHTML = `
    <span class="day">${date.toLocaleString('en-us', { weekday: 'long' })}</span>
    <span class="date">${date.getDate()}</span>
    <span class="month">${date.toLocaleString('en-us', { month: 'long' })}</span>
    <span class="year">${date.getFullYear()}</span>
  `;

  // Check if the date being created is today's date
  const today = new Date();
  if (today.getFullYear() === date.getFullYear() && today.getMonth() === date.getMonth() && today.getDate() === date.getDate()) {
    // Create a span for the current time
    let timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    
    // Function to update time
    function updateTime() {
      const now = new Date();
      timeSpan.textContent = `${now.toLocaleTimeString()}`;
    }

    // Update the time immediately and then every second
    updateTime();
    setInterval(updateTime, 1000);

    dayElement.insertBefore(timeSpan, dayElement.firstChild); // Insert at the beginning
  }
return dayElement;
}

function smoothScrollTo(element, duration) {
  const startPosition = window.scrollY;
  const targetPosition = element.getBoundingClientRect().top + window.scrollY;
  let startTime = null;

  function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = timeElapsed / duration;
      
      // Ease-out cubic function
      const ease = 1 - Math.pow(1 - progress, 3);

      window.scrollTo(0, startPosition + (targetPosition - startPosition) * ease);

      if (timeElapsed < duration) requestAnimationFrame(animation);
  }

  requestAnimationFrame(animation);
}

// Event listener for the 'previous-button'
document.getElementById('previous-button').addEventListener('click', () => {
  selectedDate.setDate(selectedDate.getDate() - 1);
  const dateString = selectedDate.toISOString().split('T')[0];
  const targetDayElement = document.querySelector(`[data-date='${dateString}']`);

  if (targetDayElement) {
      smoothScrollTo(targetDayElement, 200); // Duration in milliseconds
  }
});

document.getElementById('next-button').addEventListener('click', () => {
  selectedDate.setDate(selectedDate.getDate() + 1);

  const dateString = selectedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  const targetDayElement = document.querySelector(`[data-date='${dateString}']`);

  if (targetDayElement) {
    smoothScrollTo(targetDayElement, 200); // Duration in milliseconds
  }
});
