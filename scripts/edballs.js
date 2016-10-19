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
//   Ed Balls - What more do you need to know? Ed Balls.
//

(function() {
  module.exports = function(robot) {
    return robot.hear(/Ed Balls/i, function(msg) {
      return msg.send("Ed Balls");
    });
  };

}).call(this);
