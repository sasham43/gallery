// var fs = require('fs');
var fs = require('graceful-fs');
var path = require('path');
const csv = require('csvtojson')
var express = require('express');
var _ = require('underscore');
var router = express.Router();

var collection_path = '../../art/collection/objects';

var works = [];

router.get('/', function(req, res, next){
    req.db.works_on_view_gs.find().then(function(response){
        console.log('got stuff', response.length);
        res.send(response);
    }).catch(function(err){
        console.log('err', err);
        res.status(500).send(err);
    });
});

router.get('/random', function(req, res, next){
    req.db.query('SELECT * FROM works_on_view ORDER BY random() LIMIT 1').then(function(response){
        console.log('got random', response);
        res.send(response);
    }).catch(function(err){
        console.log('err', err);
        res.status(500).send(err);
    });
});

router.post('/rate', function(req, res, next){

    var input = [];
    var work_id = req.body.id;
    var ratings = [];

    req.body.words.forEach(function(word){
        var valence, arousal;

        switch(word){
            case 'bored':
                valence = -.3;
                arousal = -1;
                break;
            case 'depressed':
                valence = -.7;
                arousal = -.7;
                break;
            case 'sad':
                valence = -1;
                arousal = -.3;
                break;
            case 'upset':
                valence = -1;
                arousal = -.3;
                break;
            case 'nervous':
                valence = -.7;
                arousal = .7;
                break;
            case 'tense':
                valence = -.3;
                arousal = 1;
                break;
            case 'alert':
                valence = .3;
                arousal = 1;
                break;
            case 'excited':
                valence = .7;
                arousal = .7;
                break;
            case 'happy':
                valence = 1;
                arousal = .3;
                break;
            case 'contented':
                valence = 1;
                arousal = -.3;
                break;
            case 'serene':
                valence = .7;
                arousal = -.7;
                break;
            case 'relaxed':
                valence = .3;
                arousal = -1;
                break;
        }

        ratings.push({
            work_id: work_id,
            valence: valence,
            arousal: arousal
        });
    });

    req.db.word_ratings.insert(ratings).then(function(response){
        console.log('rated', response);
        res.send(response);
    }).catch(function(err){
        console.log('err', err);
        res.status(500).send(err);
    });
});

router.get('/load', function(req, res, next){
    fs.readdir(collection_path, function(err, items){
        if(err)
            console.log('err', err);

        items.forEach(function(folder){
            var pieces = fs.readdirSync(collection_path + '/' + folder);

            pieces.forEach(function(piece){
                var data = fs.readFileSync(collection_path + '/' + folder + '/' + piece, 'utf-8');
                try {
                    var parsed = JSON.parse(data);
                    var int_id = piece.replace('.json', '');
                    // var trimmed = {
                    //     id: int_id,
                    //     title: parsed.title,
                    //     description: parsed.description,
                    //     classification: parsed.classification,
                    //     image: `http://api.artsmia.org/images/${int_id}/small.jpg`
                    // }
                    parsed.mia_url = parsed.id;
                    delete parsed.id;
                    parsed.on_view = !parsed.room.includes('Not on View');

                    works.push(parsed);
                } catch (e){
                    // console.log('could not parse', data)
                }
            });
        });

        console.log('works', works.length);
        // console.log('a thing', works[500])
        // console.log('keys', Object.keys(works[500]));
        var keys = Object.keys(works[0]);
        var query = `SELECT *
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name   = 'works';`;

        var example = {
              "accession_number": "",
              "artist": "",
              "catalogue_raissonne": null,
              "classification": "",
              "continent": "",
              "country": "",
              "creditline": "",
              "culture": null,
              "curator_approved": 0,
              "dated": "",
              "department": "",
              "description": "",
              "dimension": "",
              "id": "",
              "image": "",
              "image_copyright": "",
              "image_height": 0,
              "image_width": 0,
              "inscription": "",
              "life_date": "",
              "markings": "",
              "medium": "",
              "nationality": "",
              "object_name": "",
              "portfolio": "",
              "provenance": "",
              "restricted": 0,
              "rights_type": "",
              "role": "",
              "room": "",
              "see_also": [],
              "signed": "",
              "style": "",
              "text": "",
              "title": ""
          };


        req.db.run(query).then(function(result){
            console.log('column length', result.length);
            result.forEach(function(r, index){
                // console.log('column name', r.column_name);
                // if(index == 0){
                works = works.map(function(work){
                    if(work){
                        // var keys = Object.keys(work);
                        // var found = _.find(keys, function(k){
                        //     // console.log('k', k, result.column_name, k == result.column_name);
                        //     return k == r.column_name;
                        // });
                        // if(!found){
                        //     // console.log('not found', r.column_name)
                        //     work[r.column_name] = '';
                        // }

                        // var parsed = JSON.parse(example);
                        work = _.extend(Object.assign({}, example), work);
                        keys = _.union(keys, Object.keys(work))
                        var length = Object.keys(work).length;
                        if(length < 36){
                            console.log('work is short', work);
                        }

                        return work;
                    } else {
                        return {};
                    }
                })
            });
            console.log('all keys', keys, keys.length);

            works.forEach(function(work, i){
                // if(i < 10){
                //     console.log('work', work);
                // }
                if(typeof work.culture == 'string'){
                    console.log('culture work', work);
                }
                if(typeof work.image_height == 'string'){
                    console.log('height work', work);
                    work.image_height = 0;
                }
                if(typeof work.image_width == 'string'){
                    console.log('width work', work);
                    work.image_width = 0;
                }


                if(work){
                    req.db.load_works([
                        work.accession_number,
                        work.artist,
                        work.catalogue_raissonne,
                        work.classification,
                        work.continent,
                        work.country,
                        work.creditline,
                        work.culture,
                        work.dated,
                        work.department,
                        work.description,
                        work.dimension,
                        work.mia_url,
                        work.image,
                        work.image_copyright,
                        work.image_height,
                        work.image_width,
                        work.inscription,
                        work.life_date,
                        work.marks,
                        work.markings,
                        work.medium,
                        work.nationality,
                        work.object_name,
                        work.portfolio,
                        work.provenance,
                        work.restricted,
                        work.rights_type,
                        work.role,
                        work.room,
                        work.on_view,
                        work.see_also,
                        work.signed,
                        work.style,
                        work.text,
                        work.title
                    ]).then(function(result){
                        // console.log('result', result);
                        // req.status(200).send(result);
                    }).catch(function(err){
                        console.log('err', err);
                        // res.status(500).send(err);
                    });
                } else {
                    // console.log('wor', work)
                }

            })
            res.status(200).send('worked')
        }).catch(function(err){
            console.log('err', err);
            res.status(500).send(err);
        });
    });
});

router.get('/paintings', function(req, res, next){
    req.db.paintings.find().then(function(resp){
        res.send(resp);
    }).catch(next);
});

router.get('/abstract', function(req, res, next){
    console.log('do abstract');
    var csvStr = 'ABSTRACT_groundTruth.csv';
    var paintings = [];

    csv({noheader:true})
    .fromFile(csvStr)
    .on('csv',(csvRow)=>{ // this func will be called 3 times
        // console.log('thing', csvRow) // => [1,2,3] , [4,5,6]  , [7,8,9]
        paintings.push(csvRow)
    })
    .on('done',()=>{
        //parsing finished
        paintings.forEach((row, i)=>{
            if(i > 0){
                req.db.abstract.save({
                    image: row[0],
                    amusement: row[1],
                    anger: row[2],
                    awe: row[3],
                    content: row[4],
                    disgust: row[5],
                    excitement: row[6],
                    fear: row[7],
                    sad: row[8]
                }).then((resp)=>{
                    //
                }).catch((err)=>{
                    console.log('err', err);
                })
            }
        })
    })
});

module.exports = router;
