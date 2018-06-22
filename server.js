//https://cryptic-brushlands-50373.herokuapp.com/
/*cd Program Files/MongoDB/Server/3.6/bin
mongod.exe --dbpath /Users/Roberto/mongo-data

cd Desktop/NODE/node-festival-spirit-backend

https://git.heroku.com/cryptic-brushlands-50373.git
*/

require('./config/config');

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');

let {CustomError} = require('./utils/custom-error');
let {mongoose} = require('./db/mongoose');
let {User} = require('./models/user');
let {authenticate} = require('./middleware/authenticate');
let {ReviewFestival, ReviewUser} = require('./models/review');
let {Festivalreview, Festival} = require('./models/festival');
let {Draft} = require('./models/draft');

var app = express();
const port = process.env.PORT;

app.use(bodyParser.json());

app.post('/users', (req, res) => {
  var body = _.pick(req.body, ['email', 'password']);
  var user = new User(body);

  user.save().then(() => {
    return user.generateAuthToken();
  }).then((token) => {
    res.header('x-auth', token).send(user);
  }).catch((e) => {
    res.status(400).send(e);
  })
});

app.get('/users/:id', authenticate, (req, res) => {
  res.send(req.user);
});

app.get('/users/username/:username', (req, res) => {
  var username = req.params.username;

  User.findOne({username}).then((user) => {
    res.send(user);
  }).catch((e) => {
    res.status(404).send(e.message);
  });
})

app.post('/users/login', (req, res) => {
  var body = _.pick(req.body, ['email', 'password']);

  User.findByCredentials(body.email, body.password).then((user) => {
    return user.generateAuthToken().then((token) => {
      res.header('x-auth', token).send(user);
    });
  }).catch((e) => {
    res.status(400).send();
  });
});

app.delete('/users/me/token', authenticate, (req, res) => {
  req.user.removeToken(req.token).then(() => {
    res.status(200).send();
  }, () => {
    res.status(400).send();
  });
});

app.get('/users/:id/reviews', authenticate, async (req, res) => {
  try {
    let user = await User.findById(req.body._creator);
    res.send(user.reviews);
  } catch (e) {
    res.status(404).send(e);
  }
});

app.get('/users/me/drafts', authenticate, async (req, res) => {
  try {
    let user = await User.findById(req.user._id);
    res.send(user.drafts);
  } catch (e) {
    res.status(404).send(e);
  }
});

app.post('/reviews', authenticate, async (req, res) => {

  let festival;
  let user;
  let length;
  let response = [];
  let oldRating;

  let bodyReviewFestival = _.pick(req.body, ['title', 'body', 'rating']);
  bodyReviewFestival['_creator'] = req.user._id;
  let bodyReviewUser = _.pick(req.body, ['festival','title', 'body', 'rating']);
  let reviewUser = new ReviewUser(bodyReviewUser);
  let reviewFestival = new ReviewFestival(bodyReviewFestival);

  try {
    if (!( typeof req.body.title === 'string' && req.body.title.length <= 80 && req.body.title.length >= 3)){
      throw new CustomError('Title must be between 3 and 80 chars long', 400);
    } else if (!(req.body.body.length <= 3000 && req.body.body.length >= 20 && typeof req.body.body === 'string')){
      throw new CustomError('Body must be between 20 and 3000 chars long', 400);
    } else if (!(Number.isInteger(req.body.rating) && req.body.rating >= 1 && req.body.rating <= 5)){
      throw new CustomError('Rating must be integer between 1 and 5', 400);
    }

    user = await User.findById(req.user._id);
    festival = await Festival.findOne({name: req.body.festival});
    user.reviews.filter((review) => review.festival === req.body.festival);
    if(user.reviews.length > 0) {
      oldRating = user.reviews[0].rating;
    }

    length = user.reviews.length;

    if (length === 0 && festival != null) {
      user.update({$push: {reviews: reviewUser},
      $pull: {'drafts': {'festival': 'req.body.festival'}}})
        .then((user) => {
          return Festivalreview.findOneAndUpdate({name: req.body.festival},
             { $push: { reviews: reviewFestival } },
              {new: true});
        }).then((doc) => {
          response.push(doc);

          newMeta = {
            numberOfReviews: festival.meta.numberOfReviews + 1,
            rating: (festival.meta.rating * festival.meta.numberOfReviews +
              req.body.rating) / (festival.meta.numberOfReviews + 1)
          }

          return festival.update({$set: {meta: newMeta}});
        })
        .then((doc) => {
          res.send(response);
        });

    } else if (length === 1 && festival != null) {
      User.update({'_id': req.user._id, 'reviews.festival': req.body.festival}, {$set: {'reviews.$': reviewUser},
      $pull: {'drafts': {'festival': 'req.body.festival'}}})
        .then((user) => {
          response.push(user);

          return Festivalreview.update({'name': req.body.festival, 'reviews._creator': req.user._id},
            {'$set': {'reviews.$': reviewFestival}})
        }).then((festival) => {
          response.push(festival);
          return Festival.findOne({name: req.body.festival});
        }).then((festival) => {
          let newRating = (festival.meta.rating * festival.meta.numberOfReviews
            - oldRating + req.body.rating) / (festival.meta.numberOfReviews);

          return festival.update({'$set': {'meta.rating': newRating}});
        }).then((festival) => {
          res.send(response);
        });
      }

  } catch (e) {
    if (e instanceof CustomError) {
      res.status(e.code).send(e.message);
    } else {
      res.status(404).send(e.message);
    }
  }
});

app.post('/users/me/drafts', authenticate, async (req, res) => {

  let festival = await Festival.findOne({name: req.body.festival});

  let body = _.pick(req.body, ['title', 'body', 'rating']);
  let draft = new Draft(body);

  try{
    if (!festival) {
      throw new CustomError('No festival found', 404);
      //res.status(404).send(Error('No festival found').message);
    }

    if ((!req.body.title && !req.body.body && !req.body.rating) ||
        (req.body.title === '' && req.body.body === '' && req.body.rating === '')) {
      throw new CustomError('All fields are empty', 400);
    } if (req.body.title && typeof req.body.title != 'string') {
      throw new CustomError('Title must be a string', 400);
    } if (req.body.title.length >= 80) {
      throw new CustomError('Title length must be smaller than 80 chars', 400);
    } if (req.body.body && typeof req.body.body != 'string') {
      throw new CustomError('Body must be a string', 400);
    } if (req.body.title.length >= 80) {
      throw new CustomError('Title length must be smaller than 80 chars', 400);
    } if (req.body.rating && !Number.isInteger(req.body.rating) && (req.body.rating > 5 || req.body.rating < 1)) {
      throw new CustomError('Rating must be integer from 1 to 5', 400);
    }

    let user = await User.findById(req.user._id);

    user.drafts.filter((draft) => draft.festival === req.body.festival);

    if (user.drafts.length === 0) {
      user.update({$push: {drafts: draft}}, {new: true})
      .then((doc) => {
        res.send(doc);
      });
    } else if (user.drafts.length === 1) {
      user.update({$set: {'drafts[req.body.festival]': draft}}, {new: true})
      .then((doc) => {
        res.send(doc);
      });
    }
  } catch (e) {
    if (e instanceof CustomError){
      res.status(e.code).send(e.message);
    } else {
      res.status(404).send(e.message);
    }

  }
});

app.delete('/users/me/drafts', authenticate, (req, res) => {
  User.findById(req.user._id, (err, user) => {
    if (!user) {
      return res.status(404).send();
    }

    return user.update({$pull: {'drafts': {'festival': 'req.body.festival'}}})
  }).then((doc) => {
    res.send(doc);
  }).catch((e) => {
    res.status(400).send();
  });

});

app.delete('/users/me/reviews', authenticate, (req, res) => {
  User.findById(req.user._id, (err, user) => {
    if (!user) {
      return res.status(404).send();
    }

    return user.update({$pull: {'reviews': {'festival': 'req.body.festival'}}})
  }).then((doc) => {
    res.send(doc);
  }).catch((e) => {
    res.status(400).send();
  });

});

app.listen(port, () => {
  console.log(`Started up at port ${port}`);
});

module.exports = {app};
