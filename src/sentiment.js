require("dotenv").config();
var express = require('express');
var _ = require('underscore');
var router = express.Router();
var path = require('path');
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


    // this is bad change it back

    req.db.abstract.find().then(function(paintings){
        paintings.forEach(function(p, index){
            // var int_id = getIntId(p);
            // var image_url = `http://api.artsmia.org/images/${int_id}/small.jpg`;
            var base = path.join(process.env.HOME, '/Downloads/testImages_abstract/');
            var image = p.image.replace(/'/g, '');
            var image_url = base + image;
            vision_client
              .imageProperties(image_url)
              .then(results => {
                  if(results[0].imagePropertiesAnnotation){
                      // console.log('p', p);
                      const properties = results[0].imagePropertiesAnnotation;
                      const colors = properties.dominantColors.colors;
                      colors.forEach((color, i)=> {
                          req.db.abstract_colors.save({
                              abstract_id: p.id,
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

router.get('/calculate_abstract', function(req, res, next){
    req.db.abstract.find().then(function(resp){
        var abstracts = resp;

        abstracts.forEach((abstract)=>{
            var stripped = _.omit(abstract, ['id', 'image', 'valence', 'arousal']);

            var total = 0;
            for (key in stripped) {
                total += stripped[key];
            }

            console.log('total', total);

            var v_total = 0;
            var a_total = 0;

            for (key in stripped) {
                var v_mod, a_mod;

                switch(key){
                    case 'excitement':
                    case 'amusement':
                        v_mod = 1;
                        a_mod = 1;
                        break;
                    case 'awe':
                    case 'content':
                        v_mod = 1;
                        a_mod = -1;
                        break;
                    case 'anger':
                    case 'disgust':
                        v_mod = -1;
                        a_mod = 1;
                        break;
                    case 'sad':
                    case 'fear':
                        v_mod = -1;
                        a_mod = -1;
                        break;
                }
                var v = (v_mod * stripped[key]);
                var a = (a_mod * stripped[key]);
                console.log(`${key}, ${stripped[key]}: V ${v} : A ${a}`);
                // console.log(`${key}:
                //     V ${stripped[key]} * ${v_mod} = ${v}
                //     A ${stripped[key]} * ${a_mod} = ${a}
                //     `);

                v_total += v;
                a_total += a;
            }

            var v_float = v_total / total;
            var a_float = a_total / total;

            var v_actual = numMap(v_float, -1, 1, 0, 1);
            var a_actual = numMap(a_float, -1, 1, 0, 1);

            abstract.valence = v_actual;
            abstract.arousal = a_actual;

            console.log(`calcled: ${abstract.image} | V ${v_actual} : A ${a_actual}`);
            req.db.abstract.save(abstract).then(resp=>{
                // res.send(resp);
            }).catch(next);
        })

        // req.db.abstract.save(abstracts).then(resp=>{
        //     res.send(resp);
        // }).catch(next);
    }).catch(next);
})

router.get('/abstract/generate_int', function(req, res, next){
    req.db.abstract_colors.find().then(resp=>{
        resp.forEach(a=>{
            var r = a.r;
            var g = a.g;
            var b = a.b;

            var color_int = (r<<16) + (g<<8) + b;

            a.color_int = color_int;

            req.db.abstract_colors.save(a).then(resp=>{
                // console.log('did a whatever');
            }).catch(next);
        })
    }).catch(next);
})


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

function numMap (num, in_min, in_max, out_min, out_max) {
  return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

module.exports = router;
