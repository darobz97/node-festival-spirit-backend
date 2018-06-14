require('./config/config');

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');

var {mongoose} = require('./db/mongoose');
var {User} = require('./models/user');
var {authenticate} = require('./middleware/authenticate');
var {ReviewFestival, ReviewUser} = require('./models/review');
var {Festivalreview, Festival} = require('./models/festival');

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

//TODO this shit
app.get('/users/:id/reviews', authenticate, (req, res) => {
  res.send(req.user);
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
    user = await User.findById(req.user._id);
    festival = await Festival.findOne({name: req.body.festival});
    user.reviews.filter((review) => review.festival === req.body.festival);
    if(user.reviews.length > 0) {
      oldRating = user.reviews[0].rating;
    }

    if (!( typeof req.body.title === 'string' && req.body.title.length <= 80 && req.body.title.length >= 3
        && req.body.body.length <= 3000 && req.body.body.length >= 20 && typeof req.body.body === 'string'
        && Number.isInteger(req.body.rating) && req.body.rating >= 1 && req.body.rating <= 5)) {
          throw new Error('The information sent does not meet the requirements.')
        }

    length = user.reviews.length;
  } catch (e) {
    res.status(404).send(e);
  }

  if (length === 0 && festival != null) {

    try {user.update({$push: {reviews: reviewUser}, $pull: {'drafts': {'festival': 'req.body.festival'}}})
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
      } catch (e) {
        res.status(400).send(e);
      }
  } else if (length === 1 && festival != null) {
    try{

      user.update({$set: {'reviews.$': reviewUser},
      $pull: {'drafts': {'festival': 'req.body.festival'}}}
        //,
        //{$pull: {'drafts': {'festival': 'req.body.festival'}}}
      )
        .then((user) => {
          response.push(user);

           return Festivalreview.update({'name': req.body.festival, 'reviews._creator': req.user._id},
            {'$set': {
            'reviews.$': reviewFestival
            /*.title': req.body.title,
            'reviews.$.body': req.body.body,
            'reviews.$.rating': req.body.rating*/
          }})
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
    } catch(e) {
        res.status(400).send(e)
      }
  }

});

app.delete('/users/me/drafts', authenticate, (req, res) => {
  User.findById(req.user._id, (err, user) => {
    if (!user) {
      return res.status(404).send();
    }
  }).then((user) => {
    console.log(user);
    return user.update({$pull: {'drafts': {'festival': 'req.body.festival'}}})
  }).then((doc) => {
    res.send(doc);
  }).catch((e) => {
    res.status(400).send();
  });

});

app.post('/festivals', (req, res) => {
  var festival = new Festivalreview({
    name: req.body.name,
    reviews: []
  });

  festival.save().then((doc) => {
    res.send(doc);
  }, (e) => {
    res.status(400).send(e);
  });
});


  app.delete('/todos/:id', authenticate, (req, res) => {
  var id = req.params.id;

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  Todo.findOneAndRemove({
    _id: id,
    _creator: req.user._id
  }).then((todo) => {
    if (!todo) {
      return res.status(404).send();
    }

    res.send({todo});
  }).catch((e) => {
    res.status(400).send();
  });
});

app.get('/users/me/drafts', authenticate, (req, res) => {

});

app.post('/users/me/drafts', authenticate, (req, res) => {

  var body = _.pick(req.body, ['title', 'body']);

});

app.delete('/users/me/drafts', authenticate, (req, res) => {
  req.user.removeToken(req.token).then(() => {
    res.status(200).send();
  }, () => {
    res.status(400).send();
  });
});

app.listen(port, () => {
  console.log(`Started up at port ${port}`);
});

module.exports = {app};
