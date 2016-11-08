// Description:
//
// Configuration:
//
// Commands:
//
// Notes:
//
// Author:
//   Gvnmccld
//

module.exports = function(robot) {
  robot.respond(/hello/, function(msg) {
    return msg.reply("hello!");
  });
  return robot.hear(/orly/, function(msg) {
    return msg.send("yarly");
  });
};
