from smgm import app

from flask import Flask, redirect, url_for, session, request

# Setup Flask-Login
from flask.ext.login import LoginManager, UserMixin, login_user, logout_user

login_manager = LoginManager()
login_manager.init_app(app)

class User(UserMixin):
  """A basic user. Don't bother storing things in a database; use OAuth!"""
  # Just store a mapping of users in memory.
  users_ = {}

  def __init__(self, id, name, source):
    self.id = id
    self.name = name
    self.source = source

    # This user is now logged in.
    User.users_[id] = self

@login_manager.user_loader
def load_user(user_id):
  return User.users_.get(user_id, None)

@app.route('/logout')
def logout():
  logout_user()
  return redirect(url_for('index'))

# Setup OAuth systems.
from flask_oauth import OAuth
oauth = OAuth()

## Facebook.
facebook = oauth.remote_app('facebook',
    base_url='https://graph.facebook.com/',
    request_token_url=None,
    access_token_url='/oauth/access_token',
    authorize_url='https://www.facebook.com/dialog/oauth',
    consumer_key='226144117842814',
    consumer_secret='267df7bd3878a1def7b4dd39949b3c89',
    request_token_params={'scope': 'email'}
)

@app.route('/login/facebook')
def facebook_login():
  return facebook.authorize(callback=url_for('facebook_authorized',
      next=request.args.get('next') or request.referrer or None,
      _external=True))

@app.route('/login/facebook/authorized')
@facebook.authorized_handler
def facebook_authorized(resp):
  if resp is None:
    return 'Access denied: reason=%s error=%s' % (
        request.args['error_reason'],
        request.args['error_description']
    )

  session['oauth_token'] = (resp['access_token'], '')
  me = facebook.get('/me')
  login_user(User(me.data['id'], me.data['name'], 'facebook'))
  return 'Logged in as id=%s name=%s redirect=%s' % \
      (me.data['id'], me.data['name'], request.args.get('next'))


@facebook.tokengetter
def get_facebook_oauth_token():
  return session.get('oauth_token')
