from flask import Flask
from flask.ext.login import LoginManager

app = Flask(__name__)
app.secret_key = 'super secret'

import smgm.views

# OAuth login scripts.
import smgm.login
