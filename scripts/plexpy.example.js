// Description:
//
// Configuration:
//
// Commands:
//  hubot plex latest movies - Shows the latest 10 movies added
//  hubot plex latest tv - Shows that latest 10 tv episodes added
//  hubot plex stats - Shows some random stats from the plex server
//
// Notes:
//
// Author:
//   Gvnmccld
//

var _ = require('underscore');

// USER VARIABLES
var plexpyUrl = ''; // eg. http://192.168.1.1:8181
var apiKey = ''; // Must enable API in plexpy, generated API Key goes here

var apiUrl = plexpyUrl + '/api/v2?apikey=' + apiKey + '&cmd=';

module.exports = function(robot) {
  var plexpyData = {};
  
  function getPlexPyStats(msg) {
    console.log(apiUrl + "get_home_stats&stats_count=10&time_range=360");
    var cmd = 'get_home_stats';
    var args = "&stats_count=10&time_range=360";
    robot.http(apiUrl + cmd + args).get()(function(err, res, body) {
      if (err) {
        msg.send("Encountered an error :( " + err);
      }
      var stats = {};

      plexpyData = JSON.parse(body).response.data;

      stats.top_movies = _.pluck(_.filter(plexpyData, {stat_id: 'top_movies'})[0].rows, 'title');
      stats.top_tv = _.pluck(_.filter(plexpyData, {stat_id: 'top_tv'})[0].rows, 'title');
      stats.popular_movies = _.pluck(_.filter(plexpyData, {stat_id: 'popular_movies'})[0].rows, 'title');      
      stats.popular_tv = _.pluck(_.filter(plexpyData, {stat_id: 'popular_tv'})[0].rows, 'title');
      stats.last_watched = _.pluck(_.filter(plexpyData, {stat_id: 'last_watched'})[0].rows, 'title');
      stats.most_concurrent = _.map(_.filter(plexpyData, {stat_id: 'most_concurrent'})[0].rows, function (s) {
        return { title: s.title, count: s.count };
      });
      stats.top_users = _.pluck(_.filter(plexpyData, {stat_id: 'top_users'})[0].rows, 'user');

      var ret = [];
      ret.push('*Most Watched Movies*: ' + stats.top_movies.join(', '));
      ret.push('*Popular Movies*: ' + stats.popular_movies.join(', '));
      ret.push('*Most Watched TV*: ' + stats.top_tv.join(', '));
      ret.push('*Popular TV*: ' + stats.popular_tv.join(', '));
      ret.push('*Last Watched*: ' + stats.last_watched.join(', '));
      //ret.push('*Top Users*: ' + stats.top_users.join(', '));

      return msg.send(ret.join('\n')); 
    });
  }

  function getNewestForSection(msg, sectionId) {
    var cmd = 'get_recently_added';
    var args = '&count=10&section_id=' + sectionId;

    robot.http(apiUrl + cmd + args).get()(function(err, res, body) {
      if (err) {
        msg.send("Encountered an error :( " + err);
      }
      var latest = [];
      var parsed = JSON.parse(body).response.data.recently_added;

      latest = _.map(parsed, function (s) {
        if(sectionId == 1) {
          return {show: s.grandparent_title, episode: 's' + s.parent_media_index + 'e' + s.media_index,  title: s.title}
        } else {
          return { title: s.title, year: s.year }
        }
      });
      var ret = [];
      ret.push('*Latest Added ' + (sectionId == 1 ? 'TV*' : 'Movies*'));

      for(var i = 0; i < latest.length; i++) {
        if(sectionId === 1) {
          ret.push((i+1) + '. ' + latest[i].show + ' - ' + latest[i].episode + ' - ' + latest[i].title);
        } else {
          ret.push((i+1) + '. ' + latest[i].title + ' (' + latest[i].year + ')');
        }
      }

      msg.send(ret.join('\n'));
      
    });

  }

  robot.respond(/plex stats/, function(msg) {
    getPlexPyStats(msg);
  });
  robot.respond(/plex latest movies/, function(msg) {
    getNewestForSection(msg, 2);
  });
    robot.respond(/plex latest tv/, function(msg) {
    getNewestForSection(msg, 1);
  });

};
