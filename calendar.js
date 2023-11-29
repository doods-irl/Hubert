const moment = require('moment');

function generateCalendar(month, year) {
    let calendar = [];
    let date = moment([year, month - 1]);

    const firstDayOfMonth = date.startOf('month').day();
    const daysInMonth = date.daysInMonth();

    let dayCount = 1;
    let week = [];

    // Fill in the blanks for the first week
    for (let i = 0; i < 7; i++) {
        if (i < firstDayOfMonth) {
            week.push(null);
        } else {
            week.push({ day: dayCount++, date: moment([year, month - 1, dayCount - 1]) });
        }
    }
    calendar.push(week);

    // Fill in the rest of the days
    while (dayCount <= daysInMonth) {
        week = [];
        for (let i = 0; i < 7 && dayCount <= daysInMonth; i++) {
            week.push({ day: dayCount++, date: moment([year, month - 1, dayCount - 1]) });
        }
        calendar.push(week);
    }

    return calendar;
}