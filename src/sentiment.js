require("dotenv").config();
var express = require('express');
var _ = require('underscore');
var router = express.Router();

// import series from 'async/series';

// Imports the Google Cloud client library
const language = require('@google-cloud/language');

const vision = require('@google-cloud/vision');

// Creates a client
const vision_client = new vision.ImageAnnotatorClient({
    keyFilename: '/Users/sashakramer/arts-key.json'
});

// Instantiates a client
const client = new language.LanguageServiceClient({
    keyFilename: '/Users/sashakramer/arts-key.json'
});

// console.log('keys', process.env.ART)

router.get('/vision/:int_id/:id', function(req, res, next){

    let int_id = req.params.int_id;
    let id = req.params.id;
    let image_url = `http://api.artsmia.org/images/${int_id}/small.jpg`;

    // Performs property detection on the local file
    vision_client
      .imageProperties(image_url)
      .then(results => {
        const properties = results[0].imagePropertiesAnnotation;
        const colors = properties.dominantColors.colors;
        colors.forEach((color)=> {
            req.db.vision_scores.save({
                work_id: id,
                r: color.color.red,
                g: color.color.green,
                b: color.color.blue,
                score: color.score,
                pixel_fraction: color.pixelFraction
            }).then(function(resp){
                res.send(resp)
            })
        });
      })
      .catch(next);
});

router.get('/score_paintings', function(req, res, next){
    var promises = [];
    req.db.find_paintings_to_score().then(function(paintings){
        paintings.forEach(function(p, index){
            var int_id = getIntId(p);
            var image_url = `http://api.artsmia.org/images/${int_id}/small.jpg`;
            vision_client
              .imageProperties(image_url)
              .then(results => {
                  if(results[0].imagePropertiesAnnotation){
                      // console.log('p', p);
                      const properties = results[0].imagePropertiesAnnotation;
                      const colors = properties.dominantColors.colors;
                      colors.forEach((color, i)=> {
                          req.db.vision_scores.save({
                              work_id: p.id,
                              r: color.color.red,
                              g: color.color.green,
                              b: color.color.blue,
                              score: color.score,
                              pixel_fraction: color.pixelFraction
                          }).then(function(resp){
                              if(index == 49 && i == 0){
                                  res.send(resp)
                              }
                          })
                      });
                  } else {
                      // console.log('results', results);
                  }
              })
              .catch(next);
        })
    })
});

function scorePainting(painting, callback){
    var id = painting.id;
    var image_url = `http://api.artsmia.org/images/${int_id}/small.jpg`;
    vision_client
      .imageProperties(image_url)
      .then(results => {
        const properties = results[0].imagePropertiesAnnotation;
        callback(null, {
            properties: properties,
            id: painting.id
        });
      })
      .catch(callback);
}

router.get('/:id', function(req, res, next){
    req.db.works.find({
        id: req.params.id
    }).then(function(response){
        // console.log('got stuff', response.length);
        // res.send(response);
        // The text to analyze
        const text = response[0].text;

        const document = {
          content: text,
          type: 'PLAIN_TEXT',
        };

        // Detects the sentiment of the text
        client
          .analyzeSentiment({document: document})
          .then(results => {
            const sentiment = results[0].documentSentiment;

            console.log(`Text: ${text}`);
            console.log(`Sentiment score: ${sentiment.score}`);
            console.log(`Sentiment magnitude: ${sentiment.magnitude}`);
            req.db.google_sentiment.save({
                work_id: req.params.id,
                score: sentiment.score,
                magnitude: sentiment.magnitude
            }).then(function(){
                console.log('saved');
                res.status(200).send();
            }).catch(err => {
              console.error('ERROR:', err);
              return next(err)
            });
          })
          .catch(err => {
            console.error('ERROR:', err);
            return next(err)
          });
    }).catch(function(err){
        console.log('err', err);
        res.status(500).send(err);
    });
});

function getIntId(work){
    var split = work.mia_url.split('/');
    var int_id = split[split.length-1];
    return int_id;
}

module.exports = router;
