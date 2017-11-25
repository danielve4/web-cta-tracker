$.noConflict();
jQuery(function($) {
  $(document).ready(function() {
    var FAV='fav',ROUTES='routes',DIRECT='directions',STOPS='stops',
      ARRIVALS='arrivals', FOLLOW='follow';
    var lsBusRoutes = 'lsBusStops'; //Name of item in localStorage for bus stops
    var lsBusDirections = 'lsBusDirections';
    var lsBusRouteStops = 'lsBusRouteStops';
    var lsFavorites = 'favorites'; //Name of item in localStorage
    var favorites = [];
    decideScreen();

    function decideScreen() {
      if(!location.hash) {
        if(loadFavorites() > 0) {
          setScreenTo(FAV);
          listFavorites();
        } else {
          setScreenTo(ROUTES);
        }
      } else {
        var context = parseHash(location.hash);
        if(context.hasOwnProperty('favorites')) {
          setScreenTo(FAV);
          listFavorites();
        } else  if(context.hasOwnProperty('routes')) {
          setScreenTo(ROUTES);
        } else if(context.hasOwnProperty('rt')) {
          if(context.hasOwnProperty('dir') &&
            !context.hasOwnProperty('stop-id')) {
            setScreenTo(STOPS);
            getRouteStops(context.rt,context['dir']);
          }
          else if(context.hasOwnProperty('rt-name') &&
                  context.hasOwnProperty('dir') &&
                  context.hasOwnProperty('stop-id')) {
            setScreenTo(ARRIVALS);
            getBusPredictions(context['rt'],context['rt-name'].replace(/%20/g, ' '),context['dir'],context['stop-id']);
            checkFavorite();
          }
          else if(context.hasOwnProperty('vid') &&
                  context.hasOwnProperty('stop-id') &&
                  context.hasOwnProperty('dir')) {
            setScreenTo(FOLLOW);
            getFollowBusPredictions(context['rt'], context['vid'], context['stop-id'], context['dir'])
          }
          else {
            setScreenTo(DIRECT);
            listRouteDirections(context.rt);
          }
        } else if(context.hasOwnProperty('tl')) {
          if(context.hasOwnProperty('dir') &&
                    !context.hasOwnProperty('stop')) {
            setScreenTo(STOPS);
            listLineStops(context['tl'], context['dir']);
          } else if(context.hasOwnProperty('run') &&
            context.hasOwnProperty('dir') &&
            context.hasOwnProperty('stop')) {
            setScreenTo(FOLLOW);
            getFollowTrainPredictions(context['run'], context['tl'], context['dir'], context['stop']);

          } else if(context.hasOwnProperty('dir') &&
                    context.hasOwnProperty('stop')) {
            setScreenTo(ARRIVALS);
            getTrainPredictions(context['tl'],context['dir'],context['stop']);
            checkFavorite();
          } else {
            setScreenTo(DIRECT);
            listLineDirections(context['tl']);
          }
        }
      }
    }

    function getRequest(url) {
      return new Promise((resolve,reject) => {
        $.when($.ajax({
          "async": true,
          "crossDomain": true,
          "url": url,
          "method": "GET",
          "headers": {
            "content-type": "application/json"
          },
          "processData": false
        })).then(function(data) {
          resolve(data);
        }, function () {
          reject("Error");
        });
      });
    }

    function getTrainLines() {
      var trainLines;
      if(!trainLines) {
        var url = 'allTrainStops.json';
        return getRequest(url);
      }
      return trainLines;
    }

    function getBusRoutes() {
      var busRoutes;
      if(!busRoutes) {
        var url = 'https://us-central1-cta-tracking-functions.cloudfunctions.net/busGetAllRoutes';
        return getRequest(url);
      } 
      return busRoutes;
    }

    async function listTrainLines() {
      $('#train-lines').empty();
      var trainLines = await getTrainLines();
      var line;
      for(var i=0; i<trainLines.trainLines.length; i++) {
        line = trainLines.trainLines[i];
        $('#train-lines').append(
          '<li>' +
            '<a href="#tl='+i+'">'+
              '<span class="line-color '+line.lineName.substring(0,3)+'"></span>'+
              '<span class="route-name">' +line.lineName+ ' Line</span></a>'+
          '</li>'
        );
      }
    }

    async function listBusRoutes() {
      $('#routes').empty();
      var busRoutes = await getBusRoutes();
      var route;
      for(var i=0; i< busRoutes.routes.length; i++) {
        route = busRoutes.routes[i];
        $('#routes').append(
          '<li>' +
            '<a href="#rt='+route.rt+'"id="'+route.rt+'">' +
              '<span class="route-number">'+route.rt+ '</span>' +
              '<span class="route-name">' +route.rtnm+ '</span>' +
            '</a>' +
          '</li>'
        );
      }
    }

    async function listLineDirections(lineIndex) {
      var trainLines = await getTrainLines();
      var line = trainLines.trainLines[lineIndex];
      $('#route-directions').empty();
      $('#route-directions').append('<li class="list-subheader">'+line.lineName+' Line - Choose a direction</li>');
      for(var i=0;i<line.directions.length;i++) {
        $('#route-directions').append(
          '<li><a href="#tl='+lineIndex+'#dir='+i+'">'
          +'To '+line.directions[i].direction+
          '</a></li>'
        );
      }
    }

    function getBusRouteDirections(busRoute) {
      var busRouteDirections;
      if(!busRouteDirections) {
        var url = 'https://us-central1-cta-tracking-functions.cloudfunctions.net/'+
        'busGetBusRouteDirections/?busRoute='+busRoute;
        return getRequest(url);
      }
      return busRouteDirections;
    }

    async function listRouteDirections(rNumber) {
      $('#route-directions').empty();
      var busRouteDirections = await getBusRouteDirections(rNumber);
      console.log(busRouteDirections);
      $('#route-directions').append('<li class="list-subheader">Route '+rNumber+' - Choose a direction</li>');
      for(var j=0;j<busRouteDirections.directions.length;j++) {
        $('#route-directions').append(
          '<li><a href="#rt='+rNumber+'#dir='+busRouteDirections.directions[j].dir+'">'
          +busRouteDirections.directions[j].dir+
          '</a></li>'
        );
      }
    }

    async function listLineStops(lineIndex, directionIndex) {
      var trainLines = await getTrainLines();
      var line = trainLines.trainLines[lineIndex];
      var direction = line.directions[directionIndex];
      var aStop;
      $('#stops').empty();
      $('#stops').append(
        '<li class="list-subheader">'+line.lineName+' Line - '+ direction.direction+' -  Choose a stop</li>'
      );
      for(var i=0;i<trainLines.stops.length;i++) {
        aStop = trainLines.stops[i];
        if(aStop[line.lineName] && aStop.trDr == direction.trainDirection) {
          $('#stops').append(
            '<li><a href="#tl='+lineIndex+'#dir='+directionIndex+'#stop='+i+'">'
            +aStop.stationName+
            '</a></li>'
          );
        }
      }
    }

    function getRouteStops(route, direction) {
      $('#stops').empty();
      $('#stops').append(
        '<li class="list-subheader">Route '+ route +' - '+ direction+' -  Choose a stop</li>'
      );
      var routeAndDirection = {
        'route': route,
        'direction': direction
      };

      $.when($.ajax({
        "async": true,
        "crossDomain": true,
        "url": "https://us-central1-cta-tracking-functions.cloudfunctions.net/routeStops",
        "method": "POST",
        "headers": {
          "content-type": "application/json"
        },
        "processData": false,
        "data": JSON.stringify(routeAndDirection)
      })).then(function(data) {
        listRouteStops(data['bustime-response'].stops, route, direction);
      }, function () {
        console.log('Error');
      });
    }

    function listRouteStops(stops, route, direction) {
      for(var m=0;m<stops.length;m++) {
        $('#stops').append(
          '<li><a href="#rt='+route+'#rt-name='+stops[m].stpnm+'#dir='+direction+'#stop-id='+stops[m].stpid+'">'
          +stops[m].stpnm+
          '</a></li>'
        );
      }
    }

    async function getTrainPredictions(lineIndex, directionIndex, stopIndex) {
      var trainLines = await getTrainLines();
      var line = trainLines.trainLines[lineIndex];
      var direction = line.directions[directionIndex];
      var stop = trainLines.stops[stopIndex];
      var mapId = stop.mapId;
      var stopId = stop.stopId;
      var trDr = direction.trainDirection;
      $('#arrivals').empty();
      $('#arrivals').append('<li class="list-subheader">'+stop.stationName+' - '+stop.direction+' Bound</li>');
      var trainMapId = {
        'mapId': ''+mapId+''
      };
      console.log(trainMapId);
      $.when($.ajax({
        "async": true,
        "crossDomain": true,
        "url": "https://us-central1-cta-tracking-functions.cloudfunctions.net/trainPredictions",
        "method": "POST",
        "headers": {
          "content-type": "application/json"
        },
        "processData": false,
        "data": JSON.stringify(trainMapId)
      })).then(function(data, textStatus, request) {
        listTrainPrediction(data, trDr, stopId, lineIndex, directionIndex, stopIndex);
        console.log(data);
      }, function (request, textStatus, errorThrown) {
        console.log(request.getAllResponseHeaders());
      });
    }

    function getBusPredictions(routeNumber, routeName, direction, stopId) {
      $('#arrivals').empty();
      $('#arrivals').append('<li class="list-subheader">'+routeName+' - '+ direction+'</li>');
      var stop = {
        'stopId': stopId
      };
      $.when($.ajax({
        "async": true,
        "crossDomain": true,
        "url": "https://us-central1-cta-tracking-functions.cloudfunctions.net/"+
        "busGetPredictions/?busStopId="+stopId,
        "method": "GET",
        "headers": {
          "content-type": "application/json"
        },
        "processData": false
      })).then(function(data) {
        listPredictions(data, routeNumber);
      }, function () {
        console.log('Error');
      });
    }

    function listTrainPrediction(predictions, trDr, stopId, lineIndex, directionIndex, stopIndex) {
      if(predictions.hasOwnProperty('predictions')) {
        var count = 0;
        var currentDate = new Date();
        var futureDate = new Date();
        for (var i = 0; i < predictions.predictions.length; i++) {
          if (predictions.predictions[i].stopId == stopId || predictions.predictions[i].trDr == trDr) {
            count++;
            $('#arrivals').append(
              '<li class="prediction">' +
                '<a href="#tl='+lineIndex+'#dir='+directionIndex+'#stop='+stopIndex+'#run='+predictions.predictions[i].run+'">'+
                '<span class="line-color ' + predictions.predictions[i].line.substring(0, 3) + '"></span>' +
                '<span class="destination">To ' + predictions.predictions[i].destination + '</span>' +
                '<span class="arrival-time">' + predictions.predictions[i].eta + 'm</span>' +
                ((predictions.predictions[i].isDly === '1') ? '<span class="delayed">Delayed</span>':'') +
                ((predictions.predictions[i].isSch === '1') ? '<span class="scheduled">Scheduled</span>':'') +
                '<span class="arrival-clock">'+ addMinutesAMPM(currentDate, futureDate, predictions.predictions[i].eta)+'</span>'+
                '</a>'+
              '</li>'
            );
          }
        }
        if(count === 0) {
          $('#arrivals').append(
            '<li class="prediction">' +
              '<span>No arrival times</span>'+
            '</li>'
          );
        }
      }
    }

    function listPredictions(predictions, routeNumber) {
      console.log(predictions);
      if(predictions.hasOwnProperty('prd')) {
        var currentDate = new Date();
        var futureDate = new Date();
        var arrivalMinutes;
        var arrivalClock;
        var aPredicition;
        for(var n=0;n<predictions.prd.length;n++) {
          aPredicition = predictions.prd[n];
          if(isNaN(aPredicition.prdctdn)) {
           arrivalMinutes = '';
           arrivalClock = '';
          } else {
            arrivalMinutes = 'm';
            arrivalClock = '<span class="arrival-clock">'+addMinutesAMPM(currentDate,futureDate,aPredicition.prdctdn)+'</span>';
          }
          $('#arrivals').append(
            '<li class="prediction">' +
              '<a href="#rt='+routeNumber+'#vid='+aPredicition.vid+'#stop-id='+aPredicition.stpid+'#dir='+aPredicition.rtdir+'">'+
                '<span class="route-number">'+aPredicition.rt+'</span>'+
                '<span class="destination">To '+aPredicition.des+'</span>'+
                '<span class="arrival-time">'+aPredicition.prdctdn+arrivalMinutes+'</span>'+
                arrivalClock +
              '</a>' +
            '</li>'
          );
        }
      } else if(predictions.hasOwnProperty('error')) {
        $('#arrivals').append(
          '<li class="prediction">'+predictions.error[0].msg+'</li>'
        );
      }
    }

    async function getFollowTrainPredictions(runNumber, lineIndex, directionIndex, stopIndex) {
      var trainLines = await getTrainLines();
      var line = trainLines.trainLines[lineIndex];
      var direction = line.directions[directionIndex];
      var stop = trainLines.stops[stopIndex];
      $('#follow').empty();
      $('#follow').append('<li class="list-subheader">Train Run #'+runNumber+' - '+line.lineName+' Line - '+direction.direction+'</li>');
      var trainRunNumber = {
        'runnum':''+runNumber+''
      };
      $.when($.ajax({
        "async": true,
        "crossDomain": true,
        "url": "https://us-central1-cta-tracking-functions.cloudfunctions.net/trainFollow",
        "method": "POST",
        "headers": {
          "content-type": "application/json"
        },
        "processData": false,
        "data": JSON.stringify(trainRunNumber)
      })).then(function(data) {
        listFollowTrain(data, stop.mapId);
      }, function () {
        console.log('Error');
      });
    }
    
    function listFollowTrain(predictions, stopId) {
      console.log(predictions);
      if(predictions.hasOwnProperty('predictions')) {
        var count = 0;
        var currentDate = new Date();
        var futureDate = new Date();
        var followStop;
        for (var i = 0; i < predictions.predictions.length; i++) {
          if(predictions.predictions[i].stopId == stopId) {
            followStop = ' follow-stop';
          } else {
            followStop ='';
          }
          count++;
          $('#follow').append(
            '<li class="prediction'+followStop+'">' +
            '<a href="#favorites">'+
            '<span class="destination">' + predictions.predictions[i].stopName + '</span>' +
            '<span class="arrival-time">' + predictions.predictions[i].eta + 'm</span>' +
            ((predictions.predictions[i].isDly === '1') ? '<span class="delayed">Delayed</span>':'') +
            ((predictions.predictions[i].isSch === '1') ? '<span class="scheduled">Scheduled</span>':'') +
            '<span class="arrival-clock">'+ addMinutesAMPM(currentDate, futureDate, predictions.predictions[i].eta)+'</span>'+
            '</a>'+
            '</li>'
          );
        }
        if(count === 0) {
          $('#follow').append(
            '<li class="prediction">' +
            '<span>No arrival times</span>'+
            '</li>'
          );
        }
      } else {
        $('#follow').append(
            '<li class="prediction">' +
            '<span>Unable to determine upcoming stops.</span>'+
            '</li>'
          );
      }
    }

    function getFollowBusPredictions(routeNumber, vehicleId, stopId, direction) {
      $('#follow').empty();
      $('#follow').append('<li class="list-subheader">Bus #'+vehicleId+' - '+routeNumber+' - '+ direction+'</li>');
      var busVehicleId = {
        'vehicleId': vehicleId
      };
      $.when($.ajax({
        "async": true,
        "crossDomain": true,
        "url": "https://us-central1-cta-tracking-functions.cloudfunctions.net/busFollow",
        "method": "POST",
        "headers": {
          "content-type": "application/json"
        },
        "processData": false,
        "data": JSON.stringify(busVehicleId)
      })).then(function(data) {
        listFollowBus(data, stopId);
      }, function () {
        console.log('Error');
      });
    }

    function listFollowBus(predictions, stopId) {
      console.log(predictions);
      if(predictions.hasOwnProperty('prd')) {
        var currentDate = new Date();
        var futureDate = new Date();
        var arrivalMinutes;
        var arrivalClock;
        var aPredicition;
        var followStop;
        for(var n=0;n<predictions.prd.length;n++) {
          aPredicition = predictions.prd[n];
          if(isNaN(aPredicition.prdctdn)) {
            arrivalMinutes = '';
            arrivalClock = '';
          } else {
            arrivalMinutes = 'm';
            arrivalClock = '<span class="arrival-clock">'+addMinutesAMPM(currentDate,futureDate,aPredicition.prdctdn)+'</span>';
          }
          if(aPredicition.stpid == stopId) {
            followStop = ' follow-stop';
          } else {
            followStop ='';
          }
          $('#follow').append(
            '<li class="prediction'+followStop+'">' +
              '<a href="#rt='+aPredicition.rt+'#rt-name='+aPredicition.stpnm+'#dir='+aPredicition.rtdir+'#stop-id='+aPredicition.stpid+'">'+
                '<span class="destination">'+aPredicition.stpnm+'</span>'+
                '<span class="arrival-time">'+aPredicition.prdctdn+arrivalMinutes+'</span>'+
                arrivalClock +
              '</a>' +
            '</li>'
          );
        }
      } else if(predictions.hasOwnProperty('error')) {
        $('#follow').append(
          '<li class="prediction">'+predictions.error[0].msg+'</li>'
        );
      }
    }
    
    $('#favorite-button').on('click', function (e) {
      toggleFavorite();
    });

    async function listFavorites() {
      $('#favorites').empty();
      var trainLines = await getTrainLines();
      loadFavorites();
      var route, routeName, direction, stopI, fav;
      for(var p=0;p<favorites.favorites.length;p++) {
        fav = favorites.favorites[p];
        if(favorites.favorites[p].hasOwnProperty('train')) {
          $('#favorites').append(
            '<li>' +
              '<a href="#tl='+fav.trainLine+'#dir='+fav.direction+'#stop='+fav.stop+'">' +
                '<span class="line-color '+trainLines.trainLines[fav.trainLine].lineName.substring(0,3)+'"></span>'+
                '<span class="route-direction">'+trainLines.stops[fav.stop].direction.charAt(0)+'</span>'+
                '<span class="route-name">'+trainLines.stops[fav.stop].stationName+'</span>'+
              '</a>' +
            '</li>'
          );
        } else if(!favorites.favorites[p].hasOwnProperty('train')) {
          route = favorites.favorites[p].routeNumber;
          routeName = favorites.favorites[p].routeName;
          direction = favorites.favorites[p].direction;
          stopI = favorites.favorites[p].stopId;
          $('#favorites').append(
            '<li>' +
            '<a href="#rt='+route+'#rt-name='+routeName+'#dir='+direction+'#stop-id='+stopI+'">' +
            '<span class="route-number">'+route+'</span>'+
            '<span class="route-direction">'+direction.charAt(0)+'</span>'+
            '<span class="route-name">'+routeName+'</span>'+
            '</a>' +
            '</li>'
          );
        }
      }
    }

    function loadFavorites() {
      var favoritesJSON;
      favorites = localStorage.getItem(lsFavorites);
      try {
        favoritesJSON = JSON.parse(favorites);
        if (favoritesJSON && typeof favoritesJSON === "object") {
          favorites =  favoritesJSON;
        } else {
          favoritesJSON = {
            'favorites': []
          };
        }
      }
      catch (e) {
        favoritesJSON = {
          'favorites': []
        };
      }
      favorites =  favoritesJSON;
      console.log(favorites);
      return favorites.favorites.length;
    }

    function toggleFavorite() {
      if($('#favorite-button').hasClass('fill')) {
        deleteFavorite();
      } else if($('#favorite-button').hasClass('no-fill')) {
        addToFavorites();
      }
    }

    function addToFavorites() {
      var exists = isFavorite();
      if(exists <= 0) { //Favorite does not exist
        var url = parseHash(location.hash);
        var newFavorite;
        if(url.hasOwnProperty('stop-id') && url.hasOwnProperty('rt') &&
          url.hasOwnProperty('rt-name') && url.hasOwnProperty('dir')) {
          newFavorite = {
            'routeNumber': url['rt'],
            'direction': url['dir'],
            'routeName': url['rt-name'].replace(/%20/g, ' '),
            'stopId': url['stop-id']
          };
        } else if(url.hasOwnProperty('tl') && url.hasOwnProperty('stop') && url.hasOwnProperty('dir')) {
          newFavorite = {
            'train': true,
            'trainLine': url['tl'],
            'stop': url['stop'],
            'direction': url['dir']
          };
        }
        favorites.favorites.push(newFavorite);
        localStorage.setItem(lsFavorites, JSON.stringify(favorites));
        $('#favorite-button').removeClass('no-fill');
        $('#favorite-button').addClass('fill');
      }
    }
    
    function deleteFavorite() {
      var index = isFavorite();
      if(index >= 0) {
        favorites.favorites.splice(index, 1);
        localStorage.setItem(lsFavorites, JSON.stringify(favorites));
        $('#favorite-button').removeClass('fill');
        $('#favorite-button').addClass('no-fill');
      }
    }
    
    function checkFavorite() {
      var exists = isFavorite();
      if(exists >= 0) {
        $('#favorite-button').removeClass('no-fill');
        $('#favorite-button').addClass('fill');
      } else {
        $('#favorite-button').removeClass('fill');
        $('#favorite-button').addClass('no-fill');
      }
    }

    function isFavorite() {
      var url = parseHash(location.hash);
      var stop;
      var u;
      loadFavorites();
      if(url.hasOwnProperty('stop-id') && url.hasOwnProperty('rt') &&
        url.hasOwnProperty('rt-name') && url.hasOwnProperty('dir')) {
        for (u = 0; u < favorites.favorites.length; u++) {
          if (!favorites.favorites[u].hasOwnProperty('train') &&
            url['stop-id'] === favorites.favorites[u].stopId &&
            url['dir'] === favorites.favorites[u].direction &&
            url['rt'] === favorites.favorites[u].routeNumber &&
            url['rt-name'].replace(/%20/g, ' ') === favorites.favorites[u].routeName) {
            return u;
          }
        }
      } else if(url.hasOwnProperty('tl') && url.hasOwnProperty('stop') && url.hasOwnProperty('dir')) {
        for (u = 0; u < favorites.favorites.length; u++) {
          if (favorites.favorites[u].hasOwnProperty('train') &&
            url['tl'] === favorites.favorites[u].trainLine &&
            url['stop'] === favorites.favorites[u].stop &&
            url['dir'] === favorites.favorites[u].direction) {
            return u;
          }
        }
      }

      return -1;
    }

    function setScreenTo(type) {
      $('#favorites').addClass('hidden');
      $('#routes').addClass('hidden');
      $("#train-lines").addClass('hidden');
      $('#route-directions').addClass('hidden');
      $('#stops').addClass('hidden');
      $('#arrivals').addClass('hidden');
      $('#app-bar-fav').addClass('hidden');
      $('#follow').addClass('hidden');
      switch(type) {
        case FAV:
          $('#favorites').removeClass('hidden');
          $('#favorites-nav').addClass('active');
          $('#routes-nav').removeClass('active');
          break;
        case ROUTES:
          $('#routes').removeClass('hidden');
          $("#train-lines").removeClass('hidden');
          $('#routes-nav').addClass('active');
          $('#favorites-nav').removeClass('active');
          listTrainLines();
          listBusRoutes();
          break;
        case DIRECT:
          $('#route-directions').removeClass('hidden');
          break;
        case STOPS:
          $('#stops').removeClass('hidden');
          break;
        case ARRIVALS:
          $('#arrivals').removeClass('hidden');
          $('#app-bar-fav').removeClass('hidden');
          break;
        case FOLLOW:
          $('#follow').removeClass('hidden');
          break;
        default:
          console.log('Invalid Screen Type');
          break;
      }
    }

    function parseHash(url) {
      var params = (url.substr(1)).split('#');
      var pair;
      var values = {};
      for(var k=0;k<params.length;k++){
        pair = params[k].split('=');
        values[pair[0]] = pair[1];
      }
      console.log(values);
      return values;
    }

    function addMinutesAMPM(currentDate, futureDate, minutesToAdd) {
      futureDate.setTime(currentDate.getTime() + (minutesToAdd * 60 * 1000));
      var hours = futureDate.getHours();
      var minutes = futureDate.getMinutes();
      var amOrPm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      hours = hours ? hours : 12;
      minutes = minutes < 10 ? '0'+minutes : minutes;
      var strTime = hours + ':' + minutes + amOrPm;
      return strTime;
    }

    $(window).on('hashchange', function() {
      decideScreen();
    });
  });
});
