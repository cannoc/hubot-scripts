// Description:
//   
//
// Dependencies:
//   None
//
// Configuration:
//   None
//
// Commands:
//   hubot [mute | unmute] (list | <channel name> | all) - (un)mute a channel (default: current)
//

(function() {
  var delay, muteAll, muteChannel, mute_all, mute_channels, mute_explain, mute_first, mute_listener;

  mute_channels = [];

  mute_listener = null;

  mute_all = false;

  mute_explain = {};

  mute_first = true;

  module.exports = function(robot) {
    var re;
    robot.brain.on('loaded', function() {
      if (mute_first) {
        mute_first = false;
        mute_channels = robot.brain.get('mute_channels') || [];
        return mute_all = robot.brain.get('mute_all') || false;
      }
    });
    robot.respond(/mute list$/i, function(msg) {
      var i, len, results, room;
      msg.finish();
      if (mute_channels.length === 0 && mute_all === false) {
        msg.send('No channels have been muted yet');
        return;
      }
      if (mute_all === true) {
        return msg.send('ALL channels are muted');
      } else {
        results = [];
        for (i = 0, len = mute_channels.length; i < len; i++) {
          room = mute_channels[i];
          results.push(msg.send(room + ' is muted'));
        }
        return results;
      }
    });
    robot.respond(/global (mute|unmute)$/i, function(msg) {
      var action;
      msg.finish();
      action = msg.match[1].toLowerCase();
      return muteAll(action, function(what) {
        return msg.send(what);
      });
    });
    re = new RegExp("(mute|unmute) (all|[\\" + process.env.HUBOT_MUTE_ROOM_PREFIX + "]?[\\S]+)$", "i");
    robot.respond(re, function(msg) {
      var action, channel, count, success;
      msg.finish();
      channel = msg.match[2];
      action = msg.match[1].toLowerCase();
      if (channel === 'all') {
        if (action === 'mute') {
          msg.send('Deprecated: Mute all channels now with `hubot global mute`');
          return;
        }
        count = mute_channels.length;
        if (count > 0) {
          mute_channels = [];
          msg.send('Unmuted ' + count + ' channels');
        } else {
          msg.send('No channels were muted, so nothing was done');
        }
        return;
      }
      success = muteChannel(action, channel, function(what) {
        return msg.send(what);
      });
      if (success) {
        return robot.messageRoom(channel, msg.message.user.name + ' has ' + action + 'd this channel from ' + process.env.HUBOT_MUTE_ROOM_PREFIX + msg.message.room);
      }
    });
    robot.respond(/(mute|unmute)$/i, function(msg) {
      var channel;
      msg.finish();
      channel = process.env.HUBOT_MUTE_ROOM_PREFIX + msg.message.room;
      return muteChannel(msg.match[1], channel, function(what) {
        return msg.send(what);
      });
    });
    robot.hear(/(.*)$/i, {
      id: "hubot-mute.catch_all"
    }, function(msg) {
      var reason;
      if (mute_all === false && mute_channels.indexOf(process.env.HUBOT_MUTE_ROOM_PREFIX + msg.message.room) === -1) {
        return;
      }
      if (msg.match[1].indexOf('mute') !== -1) {
        return;
      }
      msg.finish();
      if (msg.match[0].toLowerCase().indexOf(robot.name.toLowerCase()) !== 0) {
        return;
      }
      reason = mute_all === true ? 'All channels are muted' : "Channel " + process.env.HUBOT_MUTE_ROOM_PREFIX + msg.message.room + " is muted";
      if (mute_explain[msg.message.room] == null) {
        msg.send('This channel is currently muted because: ' + reason);
        mute_explain[msg.message.room] = true;
        return delay(300000, function() {
          return delete mute_explain[msg.message.room];
        });
      }
    });
    mute_listener = robot.listeners.pop();
    return robot.listeners.unshift(mute_listener);
  };

  muteAll = function(action, cb) {
    mute_all = action === 'mute';
    robot.brain.set('mute_all', mute_all);
    return cb('All channels have been ' + action + 'd');
  };

  muteChannel = function(action, channel, cb) {
    var idx;
    action = action.toLowerCase();
    if (process.env.HUBOT_MUTE_ROOM_PREFIX != null) {
      if (channel.indexOf(process.env.HUBOT_MUTE_ROOM_PREFIX) !== 0) {
        cb("Cannot " + action + " '" + channel + "'. Did you mean '" + process.env.HUBOT_MUTE_ROOM_PREFIX + channel + "'?");
        return false;
      }
    }
    if (action === 'mute') {
      if (mute_channels.indexOf(channel) > -1) {
        cb('Channel ' + channel + ' already muted');
        return false;
      }
      mute_channels.push(channel);
    } else {
      idx = mute_channels.indexOf(channel);
      if (idx === -1) {
        cb('Cannot unmute ' + channel + ' - it is not muted');
        return false;
      }
      mute_channels.splice(idx, 1);
    }
    robot.brain.set('mute_channels', mute_channels);
    cb('Channel ' + channel + ' ' + action + 'd');
    return true;
  };

  delay = function(ms, func) {
    return setTimeout(func, ms);
  };

}).call(this);
