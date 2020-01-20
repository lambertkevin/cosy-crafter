const ffmpeg = require('fluent-ffmpeg');

console.time('Merging without music');
ffmpeg('./inputs/intro_medoc.mp3')
    .input('./inputs/intro_moguri.mp3')
    .input('./inputs/intro_moguri.mp3')
    .input('./inputs/sketch.mp3')
    .input('./inputs/sujet_medoc.mp3')
    .input('./inputs/sujet_moguri.mp3')
    .input('./inputs/culture_club.mp3')
    .on('error', function(err) {
        console.log('An error occurred: ' + err.message);
    })
    .on('end', function() {
        console.log('Merging finished !');
        console.timeEnd('Merging without music');
    })
    .mergeToFile('./merged.mp3', './tmp')
    .on('progress', function(progress) {
        console.log('Processing: ' + progress.percent + '% done');
    });