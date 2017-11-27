$.noConflict();
jQuery(function($) {
  $(document).ready(function() {
    var FAV='fav',ROUTES='routes',BUS_DIRECT='busDirections', TRAIN_DIRECT='trainDirections',
      BUS_STOPS='busStops', TRAIN_STOPS= 'trainStops', BUS_ARRIVALS='busArrivals', 
      TRAIN_ARRIVALS='trainArrivals', BUS_FOLLOW='busFollow',TRAIN_FOLLOW='trainFollow';
    var LS_BUS_ROUTES = 'lsBusRoutes'; //Name of item in localStorage for bus stops
    var LS_TRAIN_LINES = 'lsTrainLines'; //Name of item in localStorage for train lines
    var lsFavorites = 'favorites'; //Name of item in localStorage for user favorites
    var favorites = [];
    decideScreen();

    function getScreen() {
      if(!location.hash) {
        if(loadFavorites() > 0) 
          return FAV;
        else 
          return ROUTES;
      } else {
        var context = parseHash(location.hash);
        if(context.hasOwnProperty('favorites')) 
          return FAV;
        else if(context.hasOwnProperty('routes')) {
          return ROUTES;
        } else if(context.hasOwnProperty('rt')) {
          if(context.hasOwnProperty('dir') && !context.hasOwnProperty('stop-id')) {
            return BUS_STOPS;
          } else if(context.hasOwnProperty('rt-name') && context.hasOwnProperty('dir') &&
                  context.hasOwnProperty('stop-id')) {
            return BUS_ARRIVALS;
          } else if(context.hasOwnProperty('vid') && context.hasOwnProperty('stop-id') &&
                  context.hasOwnProperty('dir')) {
            return BUS_FOLLOW;
          } else 
            return BUS_DIRECT;
        } else if(context.hasOwnProperty('tl')) {
          if(context.hasOwnProperty('dir') && !context.hasOwnProperty('stop')) {
            return TRAIN_STOPS;
          } else if(context.hasOwnProperty('run') && context.hasOwnProperty('dir') &&
            context.hasOwnProperty('stop')) {
              return TRAIN_FOLLOW;
          } else if(context.hasOwnProperty('dir') && context.hasOwnProperty('stop')) {
              return TRAIN_ARRIVALS;
          } else
              return TRAIN_DIRECT;
        }
      }
    }

    function hideEverything() {
      $('#favorites').addClass('hidden');
      $('#routes').addClass('hidden');
      $("#train-lines").addClass('hidden');
      $('#route-directions').addClass('hidden');
      $('#stops').addClass('hidden');
      $('#arrivals').addClass('hidden');
      $('#app-bar-fav').addClass('hidden');
      $('#follow').addClass('hidden');
      $('#refresh-button').addClass('hidden');
    }

    function decideScreen() {
      var screen = getScreen();
      var context = parseHash(location.hash);
      hideEverything();
      switch(screen) {
        case FAV:
          $('#favorites').removeClass('hidden');
          $('#favorites-nav').addClass('active');
          $('#routes-nav').removeClass('active');
          listFavorites();
          break;
        case ROUTES:
          $('#routes').removeClass('hidden');
          $("#train-lines").removeClass('hidden');
          $('#routes-nav').addClass('active');
          $('#favorites-nav').removeClass('active');
          $('#refresh-button').removeClass('hidden');
          listTrainLines();
          listBusRoutes();
          break;
        case BUS_DIRECT:
          $('#route-directions').removeClass('hidden');
          listRouteDirections(context.rt);
          break;
        case TRAIN_DIRECT:
          $('#route-directions').removeClass('hidden');
          listLineDirections(context['tl']);
          break;
        case BUS_STOPS:
          $('#stops').removeClass('hidden');
          $('#refresh-button').removeClass('hidden');
          listRouteStops(context.rt,context['dir']);
          break;
        case TRAIN_STOPS:
          $('#stops').removeClass('hidden');
          listLineStops(context['tl'], context['dir']);
          break;
        case BUS_ARRIVALS:
          $('#arrivals').removeClass('hidden');
          $('#app-bar-fav').removeClass('hidden');
          $('#refresh-button').removeClass('hidden');
          listPredictions(context['rt'],context['rt-name'].replace(/%20/g, ' '),context['dir'],context['stop-id']);
          checkFavorite();
          break;
        case TRAIN_ARRIVALS:
          $('#arrivals').removeClass('hidden');
          $('#app-bar-fav').removeClass('hidden');
          $('#refresh-button').removeClass('hidden');
          listTrainPredictions(context['tl'],context['dir'],context['stop']);
          checkFavorite();
          break;
        case BUS_FOLLOW:
          $('#follow').removeClass('hidden');
          $('#refresh-button').removeClass('hidden');
          listFollowBus(context['rt'], context['vid'], context['stop-id'], context['dir']);
          break;
        case TRAIN_FOLLOW:
          $('#follow').removeClass('hidden');
          $('#refresh-button').removeClass('hidden');
          listFollowTrain(context['run'], context['tl'], context['dir'], context['stop']);
          break;
        default:
          console.log('Invalid Screen Type');
          break;
      }
    }

    function getRequest(url) {
      console.log("Making a get request");
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
          console.log("error");
        });
      });
    }

    async function getTrainLines() {
      var trainLines = localStorage.getItem(LS_TRAIN_LINES);
      if(trainLines)
        trainLines = JSON.parse(trainLines);
      else {
        var url = 'allTrainStops.json';
        trainLines = await getRequest(url);
        localStorage.setItem(LS_TRAIN_LINES,JSON.stringify(trainLines));
      }
      return trainLines;
    }

    async function getBusRoutes() {
      var busRoutes = localStorage.getItem(LS_BUS_ROUTES);
      if(busRoutes) 
        busRoutes = JSON.parse(busRoutes);
      else {
        var url = 'https://us-central1-cta-tracking-functions.cloudfunctions.net/busGetAllRoutes';
        busRoutes = await getRequest(url);
        localStorage.setItem(LS_BUS_ROUTES,JSON.stringify(busRoutes));
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

    async function getBusRouteDirections(busRoute) {
      var busRouteDirections = localStorage.getItem('lsBusDir'+busRoute);
      if(busRouteDirections) {
        busRouteDirections = JSON.parse(busRouteDirections);
      }
      else {
        var url = 'https://us-central1-cta-tracking-functions.cloudfunctions.net/'+
        'busGetBusRouteDirections/?busRoute='+busRoute;
        busRouteDirections = await getRequest(url);
        localStorage.setItem('lsBusDir'+busRoute,JSON.stringify(busRouteDirections));
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
      $('#stops').empty();
      var trainLines = await getTrainLines();
      var line = trainLines.trainLines[lineIndex];
      var direction = line.directions[directionIndex];
      $('#stops').append(
        '<li class="list-subheader">'+line.lineName+' Line - '+ direction.direction+' -  Choose a stop</li>'
      );
      var aStop;
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

    async function getBusRouteStops(route, direction) {
      var busRouteStops = localStorage.getItem('lsBusStops'+route+direction);
      if(busRouteStops)
        busRouteStops = JSON.parse(busRouteStops);
      else {
        var url = 'https://us-central1-cta-tracking-functions.cloudfunctions.net/'+
        'busGetBusStops/?busRoute='+route+'&direction='+direction;
        busRouteStops = await getRequest(url);
        localStorage.setItem('lsBusStops'+route+direction,JSON.stringify(busRouteStops));
      }
      return busRouteStops;
    }

    async function listRouteStops(route, direction) {
      $('#stops').empty();
      $('#stops').append(
        '<li class="list-subheader">Route '+ route +' - '+ direction+' -  Choose a stop</li>'
      );
      var stops = await getBusRouteStops(route,direction);
      for(var m=0;m<stops.stops.length;m++) {
        $('#stops').append(
          '<li><a href="#rt='+route+'#rt-name='+stops.stops[m].stpnm+'#dir='+direction+'#stop-id='+stops.stops[m].stpid+'">'
          +stops.stops[m].stpnm+
          '</a></li>'
        );
      }
    }

    async function getTrainPredictions(mapId) {
      var url = 'https://us-central1-cta-tracking-functions.cloudfunctions.net/'+
      'trainGetPredictions/?mapId='+mapId;
      var predictions = await getRequest(url);
      return predictions;
    }

    async function getBusPredictions(stopId) {
      var url = "https://us-central1-cta-tracking-functions.cloudfunctions.net/"+
      "busGetPredictions/?busStopId="+stopId;
      var predictions = await getRequest(url);
      return predictions;
    }

    async function listTrainPredictions(lineIndex, directionIndex, stopIndex) {
      var trainLines = await getTrainLines();
      var line = trainLines.trainLines[lineIndex];
      var direction = line.directions[directionIndex];
      var stop = trainLines.stops[stopIndex];
      var mapId = stop.mapId;
      var stopId = stop.stopId;
      var trDr = direction.trainDirection;
      $('#arrivals').empty();
      $('#arrivals').append('<li class="list-subheader">'+stop.stationName+' - '+stop.direction+' Bound</li>');
      var predictions = await getTrainPredictions(mapId);
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
              '<span class="no-arrivals">No arrival times 😿</span>'+
            '</li>'
          );
        }
      }
    }

    async function listPredictions(routeNumber, routeName, direction, stopId) {
      $('#arrivals').empty();
      $('#arrivals').append('<li class="list-subheader">'+routeName+' - '+ direction+'</li>');
      var predictions = await getBusPredictions(stopId);
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
          '<li class="prediction"><span class="no-arrivals">'+predictions.error[0].msg+' 😿</span></li>'
        );
      }
    }

    async function getFollowTrainPredictions(runNumber) {
      var url = 'https://us-central1-cta-tracking-functions.cloudfunctions.net/'+
      'trainGetFollow/?runnum='+runNumber;
      var predictions = await getRequest(url);
      return predictions;
    }
    
    async function listFollowTrain(runNumber, lineIndex, directionIndex, stopIndex) {
      var trainLines = await getTrainLines();
      var line = trainLines.trainLines[lineIndex];
      var direction = line.directions[directionIndex];
      var stop = trainLines.stops[stopIndex];
      $('#follow').empty();
      $('#follow').append('<li class="list-subheader">Train Run #'+runNumber+' - '+line.lineName+' Line - '+direction.direction+'</li>');
      var predictions = await getFollowTrainPredictions(runNumber);
      console.log(predictions);
      if(predictions.hasOwnProperty('predictions')) {
        var count = 0;
        var currentDate = new Date();
        var futureDate = new Date();
        var followStop;
        for (var i = 0; i < predictions.predictions.length; i++) {
          if(predictions.predictions[i].stopId == stop.mapId) {
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
            '<span class="no-arrivals">No arrival times 😿</span>'+
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

    async function getFollowBusPredictions(vehicleId) {
      var url = 'https://us-central1-cta-tracking-functions.cloudfunctions.net/'+
      'busGetFollow/?vehicleId='+vehicleId;
      var predictions = await getRequest(url);
      return predictions;
    }

    async function listFollowBus(routeNumber, vehicleId, stopId, direction) {
      $('#follow').empty();
      $('#follow').append('<li class="list-subheader">Bus #'+vehicleId+' - '+routeNumber+' - '+ direction+'</li>');
      var predictions = await getFollowBusPredictions(vehicleId);
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
          '<li class="prediction"><span class="no-arrivals">'+predictions.error[0].msg+' 😿</span></li>'
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
      } catch (e) {
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

    $('#refresh-button').on('click', function(e) { //Handles the click/tap on the TOP button
      e.preventDefault();
      var screen = getScreen();
      var context = parseHash(location.hash);
      switch (screen) {
        case BUS_ARRIVALS:
          listPredictions(context['rt'],context['rt-name'].replace(/%20/g, ' '),context['dir'],context['stop-id']);
          checkFavorite();
          break;
        case BUS_FOLLOW:
          listFollowBus(context['rt'], context['vid'], context['stop-id'], context['dir']);
          break;
        case TRAIN_ARRIVALS:
          listTrainPredictions(context['tl'],context['dir'],context['stop']);
          checkFavorite();
          break;
        case TRAIN_FOLLOW:
          listFollowTrain(context['run'], context['tl'], context['dir'], context['stop']);
          break;
        default:
          console.log("Do nothing");
          break;
      }
    });
  });
});
