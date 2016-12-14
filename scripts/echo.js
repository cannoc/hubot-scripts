// Description:
//   Hubot repeats what you said (can be used for automation, eg. eardropping)
//
// Dependencies:
//   none
//
// Commands:
//   hubot echo <phrase> - Hubot will say <phrase> to the room
//   hubot echoto <room_name> <phrase> - hubot will echo something in antoher room
//   hubot commandto <room_name> <command> - hubot will do a thing in another room
//
// Author:
//  gvnmccld
//

module.exports = function(robot) {
  var TextMessage = require('hubot').TextMessage; 

  robot.respond(/echoto (.*?) (.*)/i, function(msg) {
     var room = msg.match[1];
     var text = msg.match[2];
     robot.adapter.chatdriver.getRoomId(room)
            .then(function (rid) {
	        msg.message.user.room = rid;
                var tm = new TextMessage(msg.message.user, robot.name + ": echo " + text);
                return robot.receive(tm); 
            })
            .catch(function (err) {
                msg.send("I can't find the room: " + room);
            });    
        msg.finish(); 
      });

  robot.respond(/commandto (.*?) (.*)/i, function(msg) {
     var room = msg.match[1];
     var text = msg.match[2];
     console.log('commanding to');
     robot.adapter.chatdriver.getRoomId(room)
        .then(function (rid) {
            msg.message.user.room = rid;
            var tm = new TextMessage(msg.message.user, robot.name + ": " + text);
            return robot.receive(tm);
        })
        .catch(function (err) {
            msg.send("I can't find the room: " + room);
        });
     msg.finish();
  });   

  robot.respond(/echo (.*)/i, function(msg) {
    msg.send(msg.match[1]);
    return msg.finish();
  });

};
