$.noConflict();
(function($) {
  $(document).ready(function() {
    var getDirections, failure;


    $.getJSON('stops.json', function(data) {
      myItems = data.routes;
      $.each(myItems, function (key, val) {
        $('#all-routes').append(
          '<li class="route" id="'+val.rt+'">'+
            '<a href="#0">'+val.rt+'</a>'+
          '</li>'
        );
      });
    });

    $(document).on("click",".route",function(e) {
      e.preventDefault();
      getDirections($(this).attr('id'), function(data) {
        $(this).append(
          '<ul>'+
            '<li>'+data['bustime-response'].directions[0]+'</li>'+
            '<li>'+data['bustime-response'].directions[1]+'</li>' +
          '</ul>'
        );
      });
      console.log($(this).attr('id'));
    });

    getDirections = function(route, callback) {
      $.when($.ajax({
        type: 'GET',
        url: 'http://ctabustracker.com/bustime/api/v2/getdirections?key=uExBP8b6nVp874MZXZAzW3UsT&rt='+route+'&format=json'
      })).then(callback, failure);
    };

    failure = function() {
      alert('Something went wrong');
    };

  });
})(jQuery);
