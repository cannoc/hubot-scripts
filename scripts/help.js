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
//   None
//

(function() {
  module.exports = function(robot) {
    return robot.respond(/help(?:\s+(.*))?$/i, function(msg) {
      var cmds = renamedHelpCommands(robot);
      var filter = msg.match[1];
      if (filter) {
        cmds = cmds.filter(function(cmd) {
          return cmd.match(new RegExp(filter, 'i'));
        });
        if (cmds.length === 0) {
          msg.send("No available commands match " + filter);
          return;
        }
      }
      return msg.send("*Hubot Commands* \n Syntax: (optional), [list | of | options], <value> \n\n " + cmds.join("\n"));
    });
  };

  var renamedHelpCommands = function(robot) {
    var robot_name = robot.alias || robot.name;
    var help_commands = robot.helpCommands().map(function(command) {
      return command.replace(/^hubot/i, robot_name);
    });
    return help_commands.sort();
  };

}).call(this);
