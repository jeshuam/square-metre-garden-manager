from smgm import app
from flask import render_template, abort
from flask_stormpath import login_required, user

from smgm.models.garden import Garden

import json


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/garden')
@login_required
def gardens():
    gardens_json = user.custom_data.get('gardens', {})
    gardens = [garden for garden in gardens_json.values()]
    return render_template('gardens.html',
                           gardens=sorted(gardens, key=lambda g: g['name']))


@app.route('/garden/<string:name>')
@login_required
def garden(name):
    gardens_json = user.custom_data.get('gardens', {})
    gardens = {name: Garden.Load(json) for name, json in gardens_json.items()}
    if name not in gardens:
        abort(404)

    # Load the plant information.
    plants = json.load(open('plants.json', 'rU'))

    return render_template('garden.html',
                           garden=gardens[name],
                           garden_json=json.dumps(gardens[name].Serialize()),
                           plants=plants,
                           plants_json=json.dumps(plants))
