require("dotenv").config();
var express = require('express');
var _ = require('underscore');
var router = express.Router();

// Imports the Google Cloud client library
const language = require('@google-cloud/language');

// Instantiates a client
const client = new language.LanguageServiceClient({
    keyFilename: '/Users/sashakramer/arts-key.json'
});

console.log('keys', process.env.ART)


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

module.exports = router;
