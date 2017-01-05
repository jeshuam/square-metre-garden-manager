from smgm import app
from flask import render_template
from flask_stormpath import login_required, user


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/garden')
@login_required
def garden():
    return render_template(
        'garden.html', gardens=user.custom_data.get('gardens', {}))
