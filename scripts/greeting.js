// Description:
//   Greetings for users
//
// Dependencies:
//   None
//
// Configuration:
//   None
//
// Commands:
//   hubot forget <name> greetings - Clear all of <name>'s greetings.
//   hubot greet <name> - Test out <name>'s current greeting; can be "me" or "yourself".
//   hubot greet <name> with <message> - Greet <name> with <message> when joining
//   hubot don't greet <name> with <message> - Remove a message from <name>'s greetings.
//   hubot show <name> greetings - Dump all of the greetings for <name> to the channel.
//

(function() {
  var GREETING_ROLE, freeForAll;

  freeForAll = process.env.HUBOT_GREETINGS_FFA != null;

  GREETING_ROLE = 'greeting czar';

  module.exports = function(robot) {
    var chooseTarget, sendGreeting, verifyPermission, withGreetings;
    withGreetings = function(username, callback) {
      var base, greetings, possibilities;
      greetings = (base = robot.brain.data).greetings != null ? base.greetings : base.greetings = {};
      possibilities = greetings[username] || [];
      possibilities = callback(possibilities);
      return greetings[username] = possibilities;
    };
    sendGreeting = function(msg, username) {
      var chosen, m, verbiage;
      if (username === robot.name) {
        verbiage = {
          target: 'yourself',
          owner: 'my'
        };
      } else {
        verbiage = {
          target: 'me',
          owner: 'your'
        };
      }
      chosen = "Use '" + robot.name + ": greet " + verbiage.target + " with' to customize " + verbiage.owner + " greeting!";
      withGreetings(username, function(greetings) {
        if (greetings.length > 0) {
          chosen = msg.random(greetings);
        }
        return greetings;
      });
      m = chosen.match(/^\/me\s+(.*)$/i);
      if (m) {
        return msg.emote(m[1]);
      } else {
        return msg.send(chosen);
      }
    };
    chooseTarget = function(msg, match) {
      if (match === 'me' || match === 'my') {
        return msg.message.user.name;
      }
      if (match === 'yourself' || match === 'your') {
        return robot.name;
      }
      return match;
    };
    verifyPermission = function(msg, target) {
      if (freeForAll || msg.message.user.name === target) {
        return true;
      }
      if (robot.auth.hasRole(msg.message.user, GREETING_ROLE)) {
        return true;
      } else {
        msg.reply("I can't do that, you're not a " + GREETING_ROLE + "!");
        msg.reply("Ask your admin to run '" + robot.name + ": " + msg.message.user.name + " has " + GREETING_ROLE + " role' so you can.");
        return false;
      }
    };
    robot.respond(/greet (\S+) with (.+)/i, function(msg) {
      var greeting, target, whom;
      target = chooseTarget(msg, msg.match[1]);
      if (!verifyPermission(msg, target)) {
        return;
      }
      greeting = msg.match[2];
      withGreetings(target, function(greetings) {
        greetings.push(greeting);
        return greetings;
      });
      whom = msg.match[1];
      if (msg.match[1] === 'me') {
        whom = 'you';
      }
      if (msg.match[1] === 'yourself') {
        whom = 'myself';
      }
      return msg.reply("I'll greet " + whom + " with '" + greeting + "'.");
    });
    robot.respond(/greet (\S+)$/i, function(msg) {
      var target;
      target = chooseTarget(msg, msg.match[1]);
      return sendGreeting(msg, target);
    });
    robot.respond(/don\'t greet (\S+) with (.+)/i, function(msg) {
      var found, greeting, target;
      target = chooseTarget(msg, msg.match[1]);
      if (!verifyPermission(msg, target)) {
        return;
      }
      greeting = msg.match[2];
      found = false;
      withGreetings(target, function(greetings) {
        var g, i, len, ref, results;
        found = greetings.indexOf(greeting) !== -1;
        ref = greetings || [];
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          g = ref[i];
          if (g !== greeting) {
            results.push(g);
          }
        }
        return results;
      });
      if (found) {
        return msg.reply("Greeting '" + greeting + "' is totally forgotten.");
      } else {
        return msg.reply("I wasn't going to!");
      }
    });
    robot.respond(/show (\S+)('s)? greetings$/i, function(msg) {
      var target;
      target = chooseTarget(msg, msg.match[1]);
      return withGreetings(target, function(greetings) {
        var g, i, len;
        for (i = 0, len = greetings.length; i < len; i++) {
          g = greetings[i];
          msg.reply(g);
        }
        if (greetings.length === 0) {
          msg.reply("I don't know how to greet " + target + "!");
        }
        return greetings;
      });
    });
    robot.respond(/forget (\S+)('s)? greetings$/i, function(msg) {
      var target;
      target = chooseTarget(msg, msg.match[1]);
      if (!verifyPermission(msg, target)) {
        return;
      }
      return withGreetings(target, function(greetings) {
        msg.reply("Forgetting " + greetings.length + " greetings.");
        return [];
      });
    });
    return robot.enter(function(msg) {
      return sendGreeting(msg, msg.message.user.name);
    });
  };

}).call(this);
