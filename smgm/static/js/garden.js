/**
 * Global constant view date. This is the local date that the garden is being
 * viewed at, and should change how it displays. Starts at the current date.
 *
 * @type       {Date}
 */
var _VIEW_DATE = new Date();

/**
 * Pad the given string with characters to ensure it is a certain length.
 * 
 * This can be used, for example, to pad a number with 0's.
 *
 * @class      PadWith (name)
 * @param      {string}  toPad   The string (or object) to pad.
 * @param      {number}  len     The minimum length of the result.
 * @param      {string}  char    The character to use when padding.
 * @return     {string}  A padded version of toPad, as a string.
 */
function PadWith(toPad, len, char) {
  var s = toPad + '';
  while (s.length < len) s = '' + char + s;
  return s;
}

/**
 * Custom ToString() method for dates, to ensure compatibility with Python. Will
 * format the date like follows: YYYY-MM-DD. Dates will always be saved in UTC,
 * to avoid any timezone funny business.
 * 
 * MM should be in the range 1-12, not the usual 0-11.
 *
 * @class      DateToString (name)
 * @param      {Date}  date    The date to format.
 * @return     {string}  A string version of the given date (UTC).
 */
function DateToString(date) {
  return PadWith(date.getUTCFullYear(), 4, '0') + '-' +
      PadWith(date.getUTCMonth() + 1, 2, '0') + '-' +
      PadWith(date.getUTCDate(), 2, '0');
}

/**
 * Custom ToDate() method for strings, to ensure compatibility with Python. Will
 * take a date formatted by DateToString() and convert it to a JavaScript Date
 * object. The hours/minutes/seconds/microseconds will be set to their maximum
 * values, so the date returned will be the last possible second on the given
 * day.
 * 
 * The string should be in the format YYYY-MM-DD, where MM is in the range 1-12.
 *
 * @class      StringToDate (name)
 * @param      {string}  string  The string to parse.
 * @return     {Date}    A date version of the string.
 */
function StringToDate(string) {
  var parts = string.split('-');
  var date = new Date();
  date.setUTCFullYear(parts[0]);
  date.setUTCMonth(parts[1] - 1);
  date.setUTCDate(parts[2]);
  date.setHours(23, 59, 59, 999);

  return date;
}

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
  var date = StringToDate(DateToString(_VIEW_DATE));
  $.each(slot, function(_, plant) {
    if (StringToDate(plant.harvest_date) >= date &&
        StringToDate(plant.plant_date) <= date) {
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
    $.each(plants, function(_, plant) {
      if (DateToString(_VIEW_DATE) == plant.plant_date) {
        plant_state.sow = plant;
      } else if (DateToString(_VIEW_DATE) == plant.harvest_date) {
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
  var plant_date = _VIEW_DATE;
  var harvest_date = new Date(_VIEW_DATE);
  harvest_date.setDate(harvest_date.getDate() + growth_time);

  // If there is a plant being planted in this slot on the same day,
  // then overwrite it.
  var overwrote_plant = false;
  var new_garden = $.extend(true, {}, _GARDEN);
  $.each(new_garden.slots[slot_id], function(_, plant_to_overwrite) {
    if (plant_to_overwrite.plant_date == DateToString(plant_date)) {
      overwrote_plant = true;
      plant_to_overwrite.name = plant.name;
      plant_to_overwrite.plant_date = DateToString(plant_date);
      plant_to_overwrite.harvest_date = DateToString(harvest_date);
      return false;
    }
  });

  if (!overwrote_plant) {
    new_garden.slots[slot_id].push({
      name: plant.name,
      plant_date: DateToString(plant_date),
      harvest_date: DateToString(harvest_date),
    });
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
    },

    error: function(resp, status, error) {
      $('#error').text(resp.responseJSON.error).show();
      UpdateSlots();
    },

    complete: function() { $slot.find('div.loading').hide(); }
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
    if (plant.calendar[_VIEW_DATE.getMonth()] == '' &&
        !$plant.hasClass('disabled')) {
      // If the plant
      $plant.addClass('disabled');
      $plant.find('a').tooltip('destroy');
      $plant.find('a')
          .attr('data-toggle', 'tooltip')
          .attr('data-placement', 'right')
          .attr('title', 'Not recommended to plant during this month.')
          .tooltip({container: 'body'});
    } else if ($plant.hasClass('disabled')) {
      $plant.removeClass('disabled');
      $plant.find('a').tooltip('destroy');
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
    var new_date = new Date();
    new_date.setDate(new_date.getDate() + days_diff);

    // Set the display date.
    if (days_diff == 0) {
      $('#view-date-text').text('Today');
    } else if (days_diff == -1) {
      $('#view-date-text').text('Yesterday');
    } else if (days_diff == 1) {
      $('#view-date-text').text('Tomorrow');
    } else {
      $('#view-date-text').text(DateToString(new_date));
    }

    // Move the vertical line.
    var min = parseInt($(this).attr('min'));
    var max = parseInt($(this).attr('max'));
    var percent_done = (days_diff - min) / (max - min);

    // Change the view date, and then update.
    _VIEW_DATE = new_date;
    UpdateSlots();
    UpdatePlantPicker();
  });

  // Initialize the slots and plant picker.
  UpdateSlots();
  UpdatePlantPicker();

  // Fade out the loading splash and let the user start!
  $('#loading-splash').fadeOut('slow');
});
