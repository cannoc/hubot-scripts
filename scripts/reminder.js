var Reminder, Reminders, _, chrono, moment, timeoutIds;

_ = require('lodash');

moment = require('moment');

chrono = require('chrono-node');

timeoutIds = {};

Reminders = (function() {
  function Reminders(robot1) {
    this.robot = robot1;
    this.cache = [];
    this.currentTimeout = null;
    this.robot.brain.on('loaded', (function(_this) {
      return function() {
        if (_this.robot.brain.data.reminders) {
          _this.cache = _.map(_this.robot.brain.data.reminders, function(item) {
            return new Reminder(item);
          });
          console.log("loaded " + _this.cache.length + " reminders");
          return _this.queue();
        }
      };
    })(this));
    this.robot.brain.on('save', (function(_this) {
      return function() {
        return _this.robot.brain.data.reminders = _this.cache;
      };
    })(this));
  }

  Reminders.prototype.add = function(reminder) {
    this.cache.push(reminder);
    this.cache.sort(function(a, b) {
      return a.due - b.due;
    });
    return this.queue();
  };

  Reminders.prototype.removeFirst = function() {
    var reminder;
    reminder = this.cache.shift();
    return reminder;
  };

  Reminders.prototype.queue = function() {
    var duration, extendTimeout, now, reminder, trigger;
    if (this.cache.length === 0) {
      return;
    }
    now = (new Date).getTime();
    trigger = (function(_this) {
      return function() {
        var reminder;
        reminder = _this.removeFirst();
        _this.robot.reply(reminder.msg_envelope, 'you asked me to remind you to ' + reminder.action);
        return _this.queue();
      };
    })(this);
    extendTimeout = function(timeout, callback) {
      if (timeout > 0x7FFFFFFF) {
        return setTimeout(function() {
          return extendTimeout(timeout - 0x7FFFFFFF, callback);
        }, 0x7FFFFFFF);
      } else {
        return setTimeout(callback, timeout);
      }
    };
    reminder = this.cache[0];
    duration = reminder.due - now;
    if (duration < 0) {
      duration = 0;
    }
    clearTimeout(timeoutIds[reminder]);
    timeoutIds[reminder] = extendTimeout(reminder.due - now, trigger);
    return console.log("reminder set with duration of " + duration);
  };

  return Reminders;

})();

Reminder = (function() {
  function Reminder(data) {
    var matches, pattern, period, periods;
    this.msg_envelope = data.msg_envelope, this.action = data.action, this.time = data.time, this.due = data.due;
    if (this.time && !this.due) {
      this.time.replace(/^\s+|\s+$/g, '');
      periods = {
        weeks: {
          value: 0,
          regex: "weeks?"
        },
        days: {
          value: 0,
          regex: "days?"
        },
        hours: {
          value: 0,
          regex: "hours?|hrs?"
        },
        minutes: {
          value: 0,
          regex: "minutes?|mins?"
        },
        seconds: {
          value: 0,
          regex: "seconds?|secs?"
        }
      };
      for (period in periods) {
        pattern = new RegExp('^.*?([\\d\\.]+)\\s*(?:(?:' + periods[period].regex + ')).*$', 'i');
        matches = pattern.exec(this.time);
        if (matches) {
          periods[period].value = parseInt(matches[1]);
        }
      }
      this.due = (new Date).getTime();
      this.due += ((periods.weeks.value * 604800) + (periods.days.value * 86400) + (periods.hours.value * 3600) + (periods.minutes.value * 60) + periods.seconds.value) * 1000;
    }
  }

  Reminder.prototype.formatDue = function() {
    var dueDate, duration;
    dueDate = new Date(this.due);
    duration = dueDate - new Date;
    if (duration > 0 && duration < 86400000) {
      return 'in ' + moment.duration(duration).humanize();
    } else {
      return 'on ' + moment(dueDate).format("dddd, MMMM Do YYYY, h:mm:ss a");
    }
  };

  return Reminder;

})();

module.exports = function(robot) {
  var reminders;
  reminders = new Reminders(robot);
  robot.respond(/show reminders$/i, function(msg) {
    var i, len, ref, reminder, text;
    text = '';
    ref = reminders.cache;
    for (i = 0, len = ref.length; i < len; i++) {
      reminder = ref[i];
      text += reminder.action + " " + (reminder.formatDue()) + "\n";
    }
    return msg.send(text);
  });
  robot.respond(/delete reminder (.+)$/i, function(msg) {
    var prevLength, query;
    query = msg.match[1];
    prevLength = reminders.cache.length;
    reminders.cache = _.reject(reminders.cache, {
      action: query
    });
    reminders.queue();
    if (reminders.cache.length !== prevLength) {
      return msg.send("Deleted reminder " + query);
    }
  });
  return robot.respond(/remind me (in|on) (.+?) to (.*)/i, function(msg) {
    var action, due, options, reminder, time, type;
    type = msg.match[1];
    time = msg.match[2];
    action = msg.match[3];
    options = {
      msg_envelope: msg.envelope,
      action: action,
      time: time
    };
    if (type === 'on') {
      due = chrono.parseDate(time).getTime();
      if (due.toString() !== 'Invalid Date') {
        options.due = due;
      }
    }
    reminder = new Reminder(options);
    reminders.add(reminder);
    return msg.send("I'll remind you to " + action + " " + (reminder.formatDue()));
  });
};
