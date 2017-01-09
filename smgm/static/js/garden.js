function padWith(toPad, len, char) {
  var s = toPad + '';
  while (s.length < len) s = '' + char + s;
  return s;
}

function dateToString(date) {
  return padWith(date.getUTCFullYear(), 4, '0') + '-' +
      padWith(date.getUTCMonth() + 1, 2, '0') + '-' +
      padWith(date.getUTCDate(), 2, '0');
}

function stringToDate(string) {
  var parts = string.split('-');
  var date = new Date();
  date.setUTCFullYear(parts[0]);
  date.setUTCMonth(parts[1] - 1);
  date.setUTCDate(parts[2]);
  date.setHours(23, 59, 59, 999);

  return date;
}

function getCurrentPlantInSlot(slot, date) {
  var plant = null;
  var plant_idx = -1;
  date = stringToDate(dateToString(date));
  $.each(slot, function(i, p) {
    if (stringToDate(p.harvest_date) >= date &&
        stringToDate(p.plant_date) <= date) {
      plant = p;
      plant_idx = i;
      return false;
    }
  });

  return {
    i: plant_idx,
    plant: plant,
  };
}

function daysApart(date1, date2) {
  var one_day_ms = 24 * 60 * 60 * 1000;
  var date_diff_ms = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(date_diff_ms / one_day_ms);
}

var _VIEW_DATE = new Date();

$.timeago.settings.refreshMillis = 30;
$.timeago.settings.currentTimeFunction =
    function() {
  return _VIEW_DATE;
}

// Show the slot information panel for the given slot. This will hide all other
// information panels. If there is no plant in the given slot, no panel will be
// displayed (but the current one will still be hidden).
function ShowSlotInfoPanelFor($slot) {
  // If this was called with no slot information, then just return rather
  // than dying horribly.
  if ($slot.length == 0) {
    return;
  }

  // Hide all other information panels.
  $('.plant-info').hide();

  // Extract the ID and slot/plant information.
  var slot_idx = parseInt($slot.attr('id').split('-')[1]);
  var slot = _GARDEN.slots[slot_idx];
  var plant = getCurrentPlantInSlot(slot, _VIEW_DATE);

  // This slot is now active.
  $('.slot').removeClass('active');
  $slot.addClass('active');

  // If there is no plant in that slot, then there is nothing to do.
  if (plant.i < 0) {
    return;
  }

  // Find the corresponding information panel.
  var info_panel_id = sprintf('plant-info-%d-%d', slot_idx + 1, plant.i + 1);
  var $info_panel = $('#' + info_panel_id);

  // Work out the new width of the progress bar.
  var days_since_start =
      daysApart(_VIEW_DATE, stringToDate(plant.plant.plant_date));
  var days_total = daysApart(
      stringToDate(plant.plant.plant_date),
      stringToDate(plant.plant.harvest_date));
  var progress = Math.round((days_since_start / days_total) * 100);

  // If there is no information panel associated with this slot, then we should
  // create it. This will only happen if a plant was planted using the UI and
  // then the user clicked on it. On refresh, the new plant should be present.
  if ($info_panel.length == 0) {
    // Copy the template.
    var $new_info_panel = $('#plant-info-template').clone();

    // Update the information.
    $new_info_panel.attr('id', info_panel_id);
    $new_info_panel.find('.panel-heading').text(plant.plant.name);
    $new_info_panel.find('.progress-bar').css('width', progress + '%');
    $new_info_panel.show();
    $('#plant-info').append($new_info_panel);
  } else {
    $info_panel.find('.progress-bar').css('width', progress + '%');
    $info_panel.show();
  }
};

function UpdateSlots() {
  $.each(_GARDEN.slots, function(slot_idx, slot) {
    var plant = getCurrentPlantInSlot(slot, _VIEW_DATE);

    // Find the visual slot and update the name.
    var $slot = $(sprintf('#slot-%d', slot_idx));
    if (plant.i < 0) {
      $slot.find('span.name').text('');
    } else {
      $slot.find('span.name').text(plant.plant.name);
    }
  });
};

function UpdatePlantPicker() {
  // For each plant in the plant picker...
  $('.plant').each(function(_, plant) {
    var $this = $(this);
    var plant_name = $this.attr('id');

    // Get the plant's details from the map. If the plant wasn't found, then
    // just ignore it.
    var plant = _PLANTS[plant_name];
    if (!plant) {
      return;
    }

    // Check to see if it can be planted during this month.
    var month = _VIEW_DATE.getMonth();
    if (plant.calendar[month] == '') {
      $this.addClass('disabled');
      $this.find('a').tooltip('destroy');
      $this.find('a')
          .attr('data-toggle', 'tooltip')
          .attr('data-placement', 'right')
          .attr('title', 'Not recommended to plant during this month.')
          .tooltip({container: 'body'});
    } else {
      $this.removeClass('disabled');
      $this.find('a').tooltip('destroy');
    }
  });

  // Make plants draggable.
  $('.plant').draggable({
    helper: 'clone',
    appendTo: 'body',
    scope: 'slot',
  });
};

$(function() {
  // Hide the plant information, until someone clicks on a slot.
  $('.plant-info').hide();

  // When someone clicks on a slot...
  $('div.slot').click(function() { ShowSlotInfoPanelFor($(this)); });

  // Make the slots droppable.
  $('.slot').droppable({
    scope: 'slot',

    // Accept the dropped element.
    drop: function(event, plant) {
      var $slot = $(event.target);
      var slot_id = parseInt($slot.attr('id').split('-')[1]);
      var plant_name = plant.draggable.attr('id');

      // Add a loading icon.
      $slot.find('span.name').html('<img src="/static/img/loading.gif" />');

      // Get plant information from the array.
      // TODO(jeshua): add a way to confirm/ask for information.
      var plant = _PLANTS[plant_name];

      // Add the plant to the actual slot representation.
      var growth_time = (plant.harvest_start + plant.harvest_end) / 2;
      var plant_date = _VIEW_DATE;
      var harvest_date = new Date(_VIEW_DATE);
      harvest_date.setDate(harvest_date.getDate() + growth_time);

      // If there is a plant being planted in this slot on the same day,
      // then overwrite it.
      var overwrote_plant = false;
      var new_garden = $.extend(true, {}, _GARDEN);
      $.each(new_garden.slots[slot_id], function(i, plant) {
        if (plant.plant_date == dateToString(plant_date)) {
          overwrote_plant = true;
          plant.name = plant_name;
          plant.plant_date = dateToString(plant_date);
          plant.harvest_date = dateToString(harvest_date);
          return false;
        }
      });

      if (!overwrote_plant) {
        new_garden.slots[slot_id].push({
          name: plant_name,
          plant_date: dateToString(plant_date),
          harvest_date: dateToString(harvest_date),
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
          // Add the plant to the UI.
          _GARDEN = new_garden;
          UpdateSlots();
          ShowSlotInfoPanelFor($slot);
        },

        error: function(resp, status, error) {
          $('#error').text(resp.responseJSON.error).show();
          UpdateSlots();
        },
      })
    },
  });

  // Change the view date when the selector is changed.
  $('input#view-date').on('input', function() {
    var $this = $(this);
    var days_diff = parseInt($this.val());
    var new_date = new Date();
    new_date.setDate(new_date.getDate() + days_diff);
    if (days_diff == 0) {
      $this.next('output').text('Today');
    } else if (days_diff == -1) {
      $this.next('output').text('Yesterday');
    } else if (days_diff == 1) {
      $this.next('output').text('Tomorrow');
    } else {
      $this.next('output').text(dateToString(new_date));
    }

    // Move the vertical line.
    var min = 0;
    var max = 365 * 2;
    var percent_done = (days_diff + 365) / max;
    $('div.vertical-line .line').css('left', (percent_done * 100) + '%');

    // Change the view date, and then update.
    _VIEW_DATE = new_date;
    ShowSlotInfoPanelFor($('div.slot.active'), new_date);
    UpdateSlots();
    UpdatePlantPicker();
  });

  // Update the slots and plant picker based on the current date.
  UpdateSlots();
  UpdatePlantPicker();
});
