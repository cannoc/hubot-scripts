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
  var renamedHelpCommands;

  module.exports = function(robot) {
    return robot.respond(/help(?:\s+(.*))?$/i, function(msg) {
      var cmds, emit, filter;
      cmds = renamedHelpCommands(robot);
      filter = msg.match[1];
      if (filter) {
        cmds = cmds.filter(function(cmd) {
          return cmd.match(new RegExp(filter, 'i'));
        });
        if (cmds.length === 0) {
          msg.send("No available commands match " + filter);
          return;
        }
      }
      emit = cmds.join("\n");
      msg.send("*Hubot Commands* \n Syntax: (optional), [list | of | options], <value>");
      return msg.send(emit);
    });
  };

  renamedHelpCommands = function(robot) {
    var help_commands, robot_name;
    robot_name = robot.alias || robot.name;
    help_commands = robot.helpCommands().map(function(command) {
      return command.replace(/^hubot/i, robot_name);
    });
    return help_commands.sort();
  };

}).call(this);
