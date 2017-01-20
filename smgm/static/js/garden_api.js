/**
 * This file includes a series of API functions for fetching, creating and
 * updating gardens. It does all of the AJAX magic so you don't have to.
 */

/**
 * Make a response object.
 *
 * @param      {string} name     The name of the garden.
 * @param      {bool}  success   true if the call was a success.
 * @param      {bool}  response  The AJAX response object. Used if success is
 *                                 false.
 * @return     {Object}  A response object.
 */
function _MakeResponse(name, success, response) {
  if (success) {
    return {success: true, error: null};
  }

  // Look at error cases.
  var error = '';
  switch (response.status) {
    case 404:
      error = sprintf('Unknown garden "%s"', name);
      break;
    default:
      error = response.responseJSON.error;
      break;
  }

  return {success: false, error: error};
};

/**
 * Make a new garden with the given width and height.
 *
 * @class      NewGarden (name)
 * @param      {string}  name    The name of the garden.
 * @param      {int}     width   The width of the garden.
 * @param      {int}     height  The height of the garden.
 * @return     {Object}  A jQuery.Deferred object.
 */
function NewGarden(name, width, height) {
  var new_garden = JSON.stringify({name: name, width: width, height: height});
  var deferred = new $.Deferred();

  $.post({
    url: '/api/garden',
    data: new_garden,
    contentType: 'application/json',
    success: function() { deferred.resolve(_MakeResponse(name, true)); },
    error: function(r) { deferred.resolve(_MakeResponse(name, false, r)); },
  });

  return deferred;
};

/**
 * Delete a garden with a specific name.
 *
 * @class      DeleteGarden (name)
 * @param      {string}  name    The name of the garden to delete.
 * @return     {Object}          A jQuery.Deferred object.
 */
function DeleteGarden(name) {
  var deferred = new $.Deferred();

  $.ajax({
    url: '/api/garden/' + name,
    type: 'DELETE',
    success: function() { deferred.resolve(_MakeResponse(name, true)); },
    error: function(r) { deferred.resolve(_MakeResponse(name, false, r)); },
  });

  return deferred;
};

/**
 * Update a garden.
 *
 * @class      UpdateGarden (name)
 * @param      {string}  name    The name of the garden to update.
 * @param      {string}  garden  The garden JSON string.
 * @return     {Object}          A jQuery.Deferred object.
 */
function UpdateGarden(name, garden) {
  var deferred = new $.Deferred();

  $.ajax({
    url: '/api/garden/' + name,
    type: 'PUT',
    data: garden,
    dataType: 'json',
    contentType: 'application/json',
    success: function() { deferred.resolve(_MakeResponse(name, true)); },
    error: function(r) { deferred.resolve(_MakeResponse(name, false, r)); },
  });

  return deferred;
};
