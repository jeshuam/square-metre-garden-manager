"""An API which allows the creation/deletion/modification of gardens."""

from __future__ import print_function

from garden import Plant, Garden
from smgm import app
from flask import jsonify, request, abort
from flask_stormpath import login_required, user, StormpathManager
from icalendar import Calendar


@app.route('/api/garden', methods=['GET'])
@app.route('/api/garden/<string:name>', methods=['GET'])
@login_required
def get_garden(name=None):
    gardens = user.custom_data.get('gardens', {})
    if name is None:
        return jsonify(gardens)

    if name not in garden_json:
        return dict(error="Unknown garden %s" % name), 404
    return garden_json[name]

@app.route('/api/garden', methods=['POST'])
@login_required
def post_garden():
    if not request:
        return jsonify(dict(error="No data provided")), 400

    name = request.json.get('name', None)
    width = request.json.get('width', None)
    height = request.json.get('height', None)
    if not name or not width or not height:
        missing_fields = []
        if not name: missing_fields.append('name')
        if not width: missing_fields.append('width')
        if not height: missing_fields.append('height')

        missing_fields = ', '.join(missing_fields)
        return jsonify(dict(
            error="Missing fields from request (%s)" % missing_fields)), 400

    # Make the garden.
    gardens = user.custom_data.get('gardens', {})
    garden = Garden(name, int(width), int(height))
    
    if garden.name in gardens:
        return jsonify(dict(error="Garden named %s already exists" % garden.name)), 400

    if 'gardens' not in user.custom_data:
        user.custom_data['gardens'] = {}
    user.custom_data['gardens'][garden.name] = garden.Serialize()
    user.save()

    return jsonify(dict(error=None)), 200


@app.route('/api/garden/<string:name>', methods=['PUT'])
@login_required
def put_garden(name):
    garden = Garden.Load(request.json)
    if not garden.IsValid():
        return jsonify(dict(error=garden.NotValidReason())), 400

    # Save the garden.
    user.custom_data['gardens'][garden.name] = garden.Serialize()
    user.save()
    return jsonify(dict(error=None)), 200

@app.route('/api/garden/<string:name>', methods=['DELETE'])
@login_required
def delete_garden(name):
    if name in user.custom_data['gardens']:
        del user.custom_data['gardens'][name]
        user.save()

    return jsonify(dict(error=None)), 200


@app.route('/api/gardens/ics/<string:id>', methods=['GET'])
def get_gardens_ics_for_user(id):
    base = 'https://api.stormpath.com/v1/accounts/%s'
    user = StormpathManager.load_user(base % id)
    if not user:
        abort(404)

    gardens_raw = user.custom_data.get('gardens', {})
    ics = Calendar()
    for garden_raw in gardens_raw.itervalues():
        Garden.Load(garden_raw).AddEvents(ics)

    return ics.to_ical()
