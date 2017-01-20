$(function() {
  // Update the number next to the range form fields (width/height).
  $('form input[type=range]').on('input', function() {
    $(this).next('output').text(this.value);
  });

  // On submit of the form.
  $('form#new-garden').submit(function(e) {
    e.preventDefault();

    // Validate the data.
    var $this = $(this);
    var name = $this.find('input[name=name]').val();
    var width = $this.find('input[name=width]').val();
    var height = $this.find('input[name=height]').val();
    NewGarden(name, width, height).done(function(response) {
      if (response.success) {
        // Copy a input group.
        $new_input_group = $('.garden').first().clone();
        $new_input_group.find('.btn-success').text(name);
        $('#gardens').append($new_input_group);
        $('.alert-danger').hide();
      } else {
        $('.alert-danger > span').text(response.error).parent().show();
      }
    });
  });

  // When you click on the garden, actually redirect.
  $('#gardens').on('click', 'button.btn-success', function(e) {
    var garden_name = $(this).text();
    window.location.href = '/garden/' + garden_name;
  });

  // Allow deletions.
  $('#gardens').on('click', 'button.btn-danger', function(e) {
    var $this = $(this);

    // Show a loading icon for the button.
    var $glyphicon = $this.find('.glyphicon');
    $glyphicon.removeClass('glyphicon-trash')
        .addClass('glyphicon-refresh')
        .addClass('glyphicon-refresh-animate');

    // Extract the gardens name.
    var $garden = $this.parents('.garden');
    var garden_name = $garden.find('button.btn-success').text();

    // ... and delete it.
    DeleteGarden(garden_name).done(function(response) {
      if (response.success) {
        $garden.detach();
      } else {
        $this.button('reset');
      }
    });
  })
});
