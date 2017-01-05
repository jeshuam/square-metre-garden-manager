from flask import Flask
from flask_stormpath import StormpathManager

app = Flask(__name__)
app.config['SECRET_KEY'] = 'super secret'

# TODO(jeshua): This stuff should not be here. Like, it really shouldn't. If
# this ever becomes a real thing, please move these somewhere more secure.
app.config['STORMPATH_API_KEY_ID'] = '646KV4LB30OGVAMHVEMFGK0N0'
app.config[
    'STORMPATH_API_KEY_SECRET'] = 'JSucwgxmRec03OV7D91+fLVg700JGAR8PvljlK2k3t4'
app.config['STORMPATH_APPLICATION'] = 'Square Metre Garden Manager'

stormpath_manager = StormpathManager(app)

import smgm.views
