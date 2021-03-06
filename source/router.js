var _ = require('underscore');
var config = require('../config');
var Hashids = require('hashids');
var items = require('./models/items');
var users = require('./models/users');
var collections = require('./models/collections');
var pulse = require('./models/pulse');
var hashids = new Hashids(config.hashids.salt);
var env = process.env.NODE_ENV || 'development';

module.exports = function (app) {

	var index = function (req, res) {
		if (req.cookies[config.auth.cookieName]) {
			return res.redirect(config.applicationUrl);
		}
		res.render('landing_developers', { title: 'Likeastore • Social bookmarks and favorites' });
	};

	var register = function (req, res) {
		res.render('join', { title: 'Join • Likeastore', texts: {cta: 'Sign up'} });
	};

	var login = function (req, res) {
		res.render('join', { title: 'Log in • Likeastore', texts: {cta: 'Sign in'} });
	};

	var forgotPassword = function (req, res) {
		res.render('forgot_password', { title: 'Forgot password? • Likeastore' });
	};

	var resetPassword = function (req, res) {
		if (!req.query.email || !req.query.request) {
			return res.redirect(config.siteUrl);
		}

		res.render('reset_password', { title: 'Reset password • Likeastore', email: req.query.email, request: req.query.request});
	};

	var setup = function (req, res) {
		res.render('setup', { title: 'Setup account • Likeastore', user: req.user });
	};

	var termsOfUse = function (req, res) {
		res.render('terms_of_use',  { title: 'Likeastore • Terms and Conditions of Use' });
	};

	var privacyPolicy = function (req, res) {
		res.render('privacy',  { title: 'Likeastore • Privacy Policy' });
	};

	var serverErrorPage = function (req, res) {
		res.render('error_500_page', { title: 'Internal Server Error', error: {} });
	};

	var serveDevelopersLanding = function (req, res) {
		res.render('landing_developers', { title: 'Likeastore • Social bookmarks and favorites for geeks' });
	};

	var payForService = function (req, res) {
		res.render('pay', { title: 'Likeastore • Support us!', app: config.applicationUrl });
	};

	var blank = function (req, res) {
		res.send(200, '');
	};

	var shareLike = function (req, res) {
		var hash = req.params.id;
		if (!hash) {
			return res.redirect(config.siteUrl);
		}

		var id = hashids.decryptHex(hash);
		if (!id || id === '') {
			return res.redirect(config.siteUrl);
		}

		items.findById(id, function (err, item) {
			if (err || !item) {
				return res.redirect(config.siteUrl);
			}

			users.findByEmail(item.user, function (err, user) {
				if (err || !user) {
					return res.redirect(config.siteUrl);
				}

				res.render('share_like', {
					title: (user.displayName || user.name) + '\'s like on ' + item.type + ' via likeastore',
					like: item,
					user: user
				});
			});
		});
	};

	var shareCollection = function (req, res, next) {
		var username = req.params.username;
		var hash = req.params.id;

		if (!username || !hash) {
			return res.redirect(config.siteUrl);
		}

		var collectionId = hashids.decryptHex(hash);
		if (!collectionId || collectionId === '') {
			return res.redirect(config.siteUrl);
		}

		users.findByName(username, function (err, user) {
			if (err) {
				return next(err);
			}
			if (!user) {
				return res.redirect(config.siteUrl);
			}

			collections.find(user, function (err, colls) {
				if (err) {
					return next(err);
				}
				if (!colls.length) {
					return res.redirect(config.siteUrl);
				}

				var collection = _(colls).find(function (coll) {
					return coll._id.toString() === collectionId;
				});

				if (!collection || !collection.public) {
					return res.redirect(config.siteUrl);
				}

				if (!collection.items.length) {
					return res.redirect(config.siteUrl);
				}

				if (req.cookies[config.auth.cookieName]) {
					return res.redirect(config.applicationUrl + '/u/' + user.name + '/' + collectionId);
				}

				// set collection hash for resharing
				collection.hash = hash;

				res.render('share_collection', {
					title: collection.title + ' • Likeastore',
					collection: collection,
					items: collection.items,
					user: user
				});

			});
		});
	};

	var sharePage = function (req, res, next) {
		res.render('share_app', { title: 'Likeastore • Spread the word'});
	};

	var pulsePage = function (req, res, next) {
		var age = req.params.age || 'week';

		var ages = ['day', 'week', 'month'];
		if (!_(ages).include(age)) {
			return res.redirect(config.siteUrl);
		}

		pulse.pulse(age, function (err, items) {
			if (err) {
				return next(err);
			}

			if (!items.length) {
				return res.redirect(config.siteUrl);
			}

			res.render('pulse', {
				title: 'Pulse • Likeastore',
				items: items,
				age: age
			});
		});
	};

	var checkFirstTime = function (req, res, next) {
		if (req.user.firstTimeUser) {
			return next();
		}

		var appRedirectUrl = config.applicationUrl + '?email=' + req.user.email + '&apiToken=' + req.user.apiToken;
		res.redirect(appRedirectUrl);
	};

	var checkAuth = function (req, res, next) {
		if (req.isAuthenticated()) {
			return next();
		}
		res.redirect('/register');
	};

	var fail = function (req, res, next) {
		if (env === 'production') {
			return next();
		}

		setTimeout(function () {
			var nu = null;
			nu.access();

			res.send('Hello World');
		}, 1000);
	};

	var unsubscribe = function (req, res, next) {
		if (!req.query.u) {
			return res.redirect(config.siteUrl);
		}

		users.unsubscribe(req.query.u, function (err) {
			if (err) {
				return res.redirect(config.siteUrl);
			}
			res.render('unsubscribed',  { title: 'Likeastore • Unsubscribe', app: config.applicationUrl });
		});
	};

	var verifyPage = function (req, res, next) {
		if (!req.query.u) {
			return res.redirect(config.siteUrl);
		}

		users.verify(req.query.u, function (err) {
			if (err) {
				return res.redirect(config.siteUrl);
			}
			res.render('verified',  { title: 'Likeastore • Email Verified', app: config.applicationUrl });
		});
	};

	app.get('/', index);
	app.get('/join', register);
	app.get('/register', register);
	app.get('/login', login);
	app.get('/forgot-password', forgotPassword);
	app.get('/reset-password', resetPassword);
	app.get('/setup', checkAuth, checkFirstTime, setup);
	app.get('/terms', termsOfUse);
	app.get('/privacy', privacyPolicy);
	app.get('/s/:id', shareLike);
	app.get('/u/:username/:id', shareCollection);
	app.get('/pulse', pulsePage);
	app.get('/pulse/:age', pulsePage);
	app.get('/unsubscribe', unsubscribe);
	app.get('/fail', fail);
	app.get('/500', serverErrorPage);
	app.get('/geeks', serveDevelopersLanding);
	app.get('/developers', serveDevelopersLanding);
	app.get('/pay', payForService);
	app.get('/share', sharePage);
	app.get('/verify', verifyPage);

	app.get('/blank.html', blank);
};
