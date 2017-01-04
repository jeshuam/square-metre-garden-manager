from smgm import app

from flask import redirect, url_for, render_template

@app.route('/')
def index():
  return redirect(url_for('login'))

@app.route('/login')
def login():
  return render_template('login.html')
