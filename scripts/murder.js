// Description
//   Kill your Hubot
//
// Commands:
//   hubot (die|restart|reboot) - Kills hubot
//
// Author:
//   Chris Contolini


var messages = {
  birth: ["I'm baaaaaaaaack. :mattjm:", "I'm back from the dead. :angel:", "Bot reporting in. :muscle:", "I missed you :couplekiss:"],
  death: ["Et tu, Brute? :sob:", "Ouch. BRB. :knife:", "See ya later. :urinal:", "You'll pay for this. :goberserk: BRB."]
};

var randMsg = function(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
};

var MurderRobot = (function() {
  function MurderRobot(robot) {
    var _this = this;
    this.robot = robot;
    robot.brain.on('loaded', function() {
      var murderScene = _this.robot.brain.get('murderScene');
      if (murderScene && murderScene.placeOfDeath && ((Date.now() - murderScene.timeOfDeath) < 120000) && ((Date.now() - murderScene.timeOfDeath) > 1000)) {
        _this.robot.brain.set('murderScene', {});
        _this.robot.brain.save();
        
        var msg = murderScene.perp + ": " + (randMsg(messages.birth));
        return _this.robot.messageRoom(murderScene.placeOfDeath, msg);
      }
    });
  }

  MurderRobot.prototype.kill = function(res) {
    var murderScene = {
      timeOfDeath: Date.now(),
      placeOfDeath: res.envelope.room,
      perp: res.envelope.user.name
    };

    res.send(randMsg(messages.death));

    this.robot.brain.set('murderScene', murderScene);
    this.robot.brain.save();
    return setTimeout(function() {
      return process.exit(0);
    }, 500);
  };

  return MurderRobot;

})();

module.exports = function(robot) {
  var murderRobot = new MurderRobot(robot);
  return robot.respond(/(die|restart|reboot)/, function(res) {
    murderRobot.kill(res);
  });
};
