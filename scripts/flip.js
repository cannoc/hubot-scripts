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
//   hubot [flip | rage flip | unflip] <text> - Flip or unflip some text
//

(function() {
  var flip;

  flip = require('flip');

  module.exports = function(robot) {
    robot.respond(/(rage )?flip( .*)?$/i, function(msg) {
      var flipped, guy, toFlip;
      if (msg.match[1] === 'rage ') {
        guy = '(ノಠ益ಠ)ノ彡';
      } else {
        guy = '(╯°□°）╯︵';
      }
      toFlip = (msg.match[2] || '').trim();
      if (toFlip === 'me') {
        toFlip = msg.message.user.name;
      }
      if (toFlip === '') {
        flipped = '┻━┻';
      } else {
        flipped = flip(toFlip);
      }
      return msg.send(guy + " " + flipped);
    });
    return robot.respond(/unflip( .*)?$/i, function(msg) {
      var toUnflip, unflipped;
      toUnflip = (msg.match[1] || '').trim();
      if (toUnflip === 'me') {
        unflipped = msg.message.user.name;
      } else if (toUnflip === '') {
        unflipped = '┬──┬';
      } else {
        unflipped = toUnflip;
      }
      return msg.send(unflipped + " ノ( º _ ºノ)");
    });
  };

}).call(this);
