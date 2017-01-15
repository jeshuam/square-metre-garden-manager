/**
 * Global constant view date. This is the local date that the garden is being
 * viewed at, and should change how it displays. Starts at the current date.
 *
 * @type       {Date}
 */
var _VIEW_DATE = moment();

/**
 * Utility function to convert the given string into a time. It is assumed to be
 * the string value returned by .toLongDateString().
 *
 * @class      StringToDate (name)
 * @param      {string}  str     The .toLongDateString() string.
 * @return     {Date}    A date object representing that string.
 */
function StringToDate(str) {
  return moment(str).startOf('day');
};

function DateToString(date) {
  return date.format();
};

function DaysBetween(date1, date2) {
  return date2.subtract(date1).days();
};

/**
 * Get the plants which are currently active in the given slot.
 *
 * Will return a list of plant objects, each of which has it's plant date before
 * the view date and it's harvest date after the view date.
 *
 * There should be at most 2 results returned per slot.
 *
 * @class      GetCurrentPlantsInSlot (name)
 * @param      {Object}  slot    The slot to extract plants from.
 * @return     {Array}   The current plants for the given slot.
 */
function GetCurrentPlantsInSlot(slot) {
  var plants = [];
  $.each(slot, function(_, plant) {
    if (_VIEW_DATE.isBetween(
            StringToDate(plant.plant_date), StringToDate(plant.harvest_date),
            'day', '[]')) {
      plants.push(plant);
    }
  });

  return plants;
}

/**
 * Update the slots on the display. This will go through each slot and modify
 * it's DOM so that it displays the correct thing for the current view time.
 * This should be called every time a new plant is added or _VIEW_DATE is
 * changed.
 *
 * @class      UpdateSlots (name)
 */
function UpdateSlots() {
  $.each(_GARDEN.slots, function(slot_idx, slot) {
    var plants = GetCurrentPlantsInSlot(slot);

    // Determine the state of each plant obtained. They can either be sowing,
    // harvesting or planting, and there can only be one of each.
    var plant_state = {};
    $.each(plants, function(plant_idx, plant) {
      if (_VIEW_DATE.isSame(StringToDate(plant.plant_date))) {
        plant_state.sow = plant;
      } else if (_VIEW_DATE.isSame(StringToDate(plant.harvest_date))) {
        plant_state.harvest = plant;
      } else {
        plant_state.growing = plant;
      }
    });


    /**
     * Utility function to show/hide a given state within the plant_state
     * structure.
     *
     * @class      _ShowOrHideState (name)
     * @param      {string}  state   The name of the state to show/hide.
     */
    var _ShowOrHideState = function(state) {
      var $state_div = $slot.find(sprintf('.%s', state));
      if (state in plant_state) {
        $state_div.show().find('span').text(plant_state[state].name);
      } else {
        $state_div.hide();
      }
    };

    // Update the slots
    var $slot = $(sprintf('#slot-%d', slot_idx));
    _ShowOrHideState('sow');
    _ShowOrHideState('harvest');
    _ShowOrHideState('growing');

    // If nothing is being displayed, suggest adding something.
    if (!plant_state.sow && !plant_state.growing) {
      $slot.find('.new').show();
    } else {
      $slot.find('.new').hide();
    }
  });
};

/**
 * Add a new time bar for plant plant_idx in slot slot_idx.
 *
 * @class      AddNewTimeBar (name)
 * @param      {int}  slot_idx   The slot index.
 * @param      {int}  plant_idx  The plant index.
 */
function AddNewTimeBar(slot_idx, plant_idx) {
  var slot = _GARDEN.slots[slot_idx];
  var plant = slot[plant_idx];

  // Work out the start and end of the viewable time range.
  var $range_input = $('#view-date');
  var start = moment().add(parseInt($range_input.attr('min')), 'days');
  var end = moment().add(parseInt($range_input.attr('max')), 'days');
  var days_total = end.diff(start, 'days');

  // If this is the first plant in the thing, it must be a new slot.
  var whitespace_percent = 0, plant_percent = 0;
  var next_whitespace = -1;  // > 0 if we need to modify the next whitespace.
  if (plant_idx == 0) {
    // If this plant was planted after the start, we need some whitespace.
    if (StringToDate(plant.plant_date).isAfter(start)) {
      var days_since_start = StringToDate(plant.plant_date).diff(start, 'days');
      whitespace_percent = ((days_since_start + 1) / days_total) * 100.0;
    }
  }

  // Otherwise, if there are other plants...
  else if (plant_idx > 0) {
    var previous_plant = slot[plant_idx - 1];
    var days_since_last_plant_end =
        StringToDate(plant.plant_date)
            .diff(StringToDate(previous_plant.harvest_date), 'days');
    var whitespace_percent = (days_since_last_plant_end / days_total) * 100.0;

    // If there is a plant after me, we need to adjust that plant too.
    if (slot.length > plant_idx + 1) {
      var next_plant = slot[plant_idx + 1];
      var days_bewteen_this_end_and_next_start =
          StringToDate(next_plant.plant_date)
              .diff(StringToDate(plant.harvest_date), 'days');
      var next_whitespace =
          (days_bewteen_this_end_and_next_start / days_total) * 100.0;
    }
  }

  // Work out the plant percent.
  var days_of_plant = StringToDate(plant.harvest_date)
                          .diff(StringToDate(plant.plant_date), 'days');
  var plant_percent = (days_of_plant / days_total) * 100.0;

  // Add the whitespace bar into the right spot.
  var $whitespace_bar = $('<div />')
                            .addClass('padding')
                            .addClass('progress-bar')
                            .css('width', whitespace_percent + '%');
  var $plant_bar = $('<div />')
                       .addClass('progress-bar')
                       .css('width', plant_percent + '%')
                       .text(plant.name);

  var $progress = $($('#slot-bars .progress').get(slot_idx));

  console.log(plant_idx, slot.length);
  if (plant_idx == 0 || plant_idx == slot.length - 1) {
    $progress.append($whitespace_bar).append($plant_bar);
  } else if (plant_idx > 0) {
    var $previous_bar = $($progress.find('.progress-bar')[plant_idx * 2 - 1]);
    var $following_bar = $previous_bar.next();
    $previous_bar.after($plant_bar).after($whitespace_bar);
    $following_bar.css('width', next_whitespace + '%');
  }

  // If the total width of the progress bars is too large, shrink the last one
  // so it fits.
  var total_percent = 0.0;

  // Update the progress bars.
  $progress.find('.progress-bar').each(function(i, e) {
    var $this = $(e);
    total_percent += ($this.width() / $this.parent().width()) * 100;

    // If we are on a non-padding row, and half this index is even, make it
    // green.
    if (!$this.hasClass('padding')) {
      if (Math.floor(i / 2) % 2 == 0) {
        $this.addClass('progress-bar-success');
      } else {
        $this.removeClass('progress-bar-success');
      }
    }
  });

  if (total_percent > 100) {
    var percent_delta = total_percent - 100;
    var new_width_delta = $progress.width() * (percent_delta / 100.0);
    var $last_bar = $progress.find('.progress-bar').last();
    console.log(
        $progress.width(), new_width_delta, percent_delta, $last_bar.width());
    $last_bar.width($last_bar.width() - new_width_delta);
  }
};

/**
 * So a new plant in the given slot. Will actually attempt to save the new
 * garden, and will fail with an error if it could not.
 *
 * @class      SowNewPlant (name)
 * @param      {Object}  $slot   The slot to save the plant in (in the DOM).
 * @param      {Object}  plant   The plant to save (as an Object).
 */
function SowNewPlant($slot, plant) {
  // Extract the slot ID.
  var slot_id = parseInt($slot.attr('id').split('-')[1]);

  // Hide the new-plant div (in-case they used that) and show the loading icon.
  $slot.find('div.new').hide();
  $slot.find('div.loading').show();

  // Add the plant to the actual slot representation.
  var growth_time = (plant.harvest_start + plant.harvest_end) / 2;
  var plant_date = moment(_VIEW_DATE);
  var harvest_date = moment(_VIEW_DATE).add(growth_time, 'days');

  // If there is a plant being planted in this slot on the same day,
  // then overwrite it.
  var overwrote_plant = false;
  var new_garden = $.extend(true, {}, _GARDEN);
  var new_idx = new_garden.slots[slot_id].length;
  $.each(new_garden.slots[slot_id], function(plant_idx, plant_to_overwrite) {
    if (StringToDate(plant_to_overwrite.plant_date).isSame(plant_date)) {
      overwrote_plant = true;
      plant_to_overwrite.name = plant.name;
      plant_to_overwrite.plant_date = DateToString(plant_date);
      plant_to_overwrite.harvest_date = DateToString(harvest_date);
      new_idx = plant_idx;
      return false;
    }
  });

  if (!overwrote_plant) {
    // Find the insertion point; it's the one just before the one which has a
    // plant date after my harvest date.
    $.each(new_garden.slots[slot_id], function(i, plant) {
      if (StringToDate(plant.plant_date).isSameOrAfter(harvest_date)) {
        new_idx = i;
        return false;
      }
    });

    var new_plant = {
      name: plant.name,
      plant_date: DateToString(plant_date),
      harvest_date: DateToString(harvest_date),
    };

    new_garden.slots[slot_id].splice(new_idx, 0, new_plant);
  }

  // Save the garden.
  $('#error').hide();
  $.ajax({
    url: '/api/garden/' + new_garden.name,
    type: 'PUT',
    data: JSON.stringify(new_garden),
    contentType: 'application/json',
    success: function(resp) {
      _GARDEN = new_garden;
      UpdateSlots();
      AddNewTimeBar(slot_id, new_idx);
    },

    error: function(resp, status, error) {
      $('#error').text(resp.responseJSON.error).show();
      UpdateSlots();
    },

    complete: function() { $slot.find('div.loading').hide(); },
  });
}

/**
 * Update the plant picker (on the left) based on the current _VIEW_DATE.
 *
 * @class      UpdatePlantPicker (name)
 */
function UpdatePlantPicker() {
  $('#navbar-plants .plant').each(function(_, plant) {
    var $plant = $(plant);

    // Get the plant's details from the map. If the plant wasn't found, then
    // just ignore it.
    var plant = _PLANTS[$plant.attr('id')];
    if (!plant) {
      return;
    }

    // Check to see if it can be planted during this month.
    if (plant.calendar[_VIEW_DATE.month()] == '') {
      if (!$plant.hasClass('disabled')) {
        $plant.addClass('disabled');
        $plant.find('a').tooltip('destroy');
        $plant.find('a')
            .attr('data-toggle', 'tooltip')
            .attr('data-placement', 'right')
            .attr('title', 'Not recommended to plant during this month.')
            .tooltip({container: 'body'});
      }
    } else {
      if ($plant.hasClass('disabled')) {
        $plant.removeClass('disabled');
        $plant.find('a').tooltip('destroy');
      }
    }
  });
};

/**
 * Setup the page.
 */
$(function() {
  ///
  /// Left navbar setup.
  ///
  // Make the plants in the navbar draggable.
  $('#navbar-plants .plant').draggable({
    helper: 'clone',
    appendTo: 'body',
    scope: 'slot',
  });

  ///
  /// Setup the callbacks to allow sowing using the keyboard.
  ///
  var $slot_new = $('div#garden div.slot div.new');

  // Setup the input tag.
  $slot_new.find('input')
      .typeahead({
        source: Object.keys(_PLANTS),
      })
      .focusout(function() {
        $(this).hide().parents('.slot').find('img').css('display', '');
      })
      .keypress(function(e) {
        if (e.which == 13) {
          e.preventDefault();

          if (_PLANTS[$(this).val()]) {
            SowNewPlant($(this).parents('.slot'), _PLANTS[$(this).val()]);
            $(this).hide();
            $(this).val('');
          } else {
            $(this).parents('.form-group').addClass('has-error');
          }
        } else {
          $(this).parents('.form-group').removeClass('has-error');
        }
      });

  // Hide the sow image and show the corresponding input text box.
  $slot_new.find('img').click(function() {
    $(this).hide().parents('.slot').find('input').show().focus();
  });

  ///
  /// Setup the time-bars.
  ///
  // Make the top thing resizable.
  $('#slot-bars').resizable({
    grid: [0, 21],
    handles: 's',
    maxHeight: ($('div#garden div.slot').length + 1) * 21,
    minHeight: 21,
  });

  ///
  /// Setup the slots.
  ///
  // Make the slots droppable.
  $('.slot').droppable({
    scope: 'slot',

    // Accept the dropped element.
    drop: function(event, plant) {
      var $slot = $(event.target);
      var plant = _PLANTS[plant.draggable.attr('id')];
      SowNewPlant($slot, plant);
    },
  });

  // Update the view date display when the view date is changed. Also trigger
  // all of the necessary callbacks.
  $('input#view-date').on('input', function() {
    var $this = $(this);
    var days_diff = parseInt($this.val());

    // Change the view dated based on the number of days.
    _VIEW_DATE = moment().add(days_diff, 'days').startOf('day');

    // Set the display date.
    if (days_diff == 0) {
      $('#view-date-text').text('Today');
    } else if (days_diff == -1) {
      $('#view-date-text').text('Yesterday');
    } else if (days_diff == 1) {
      $('#view-date-text').text('Tomorrow');
    } else {
      $('#view-date-text').text(_VIEW_DATE.format('LL'));
    }

    // Change the view date, and then update.
    UpdateSlots();
    UpdatePlantPicker();
  });

  // Initialize the slots and plant picker.
  UpdateSlots();
  UpdatePlantPicker();

  // Fade out the loading splash and let the user start!
  $('#loading-splash').fadeOut('slow');
});
