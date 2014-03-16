var Crawler = require("crawler").Crawler;

// Retrieve
var MongoClient = require('mongodb').MongoClient;

var setupCrawler = function(collection){
    var c = new Crawler({
        "maxConnections":1,
        
        // This will be called for each crawled page
        "callback":function(error,result,$) {
            var rx = /^http:\/\/www.slate.com\/full_slate/;
            
            if(rx.test(result.request.uri.href)) {
                // on the index page
                console.log("On the index: " + result.request.uri.href);
                $(".tile.basic.full-width.long-hed a.primary").each(function(index,a) {
                    collection.findOne({URL: a.href}, function(err, article){
                        if(article === null){
                            // not in the database already
                            // so let's queue it
                            c.queue(a.href);
                        } else {
                            console.log("Skipping an article: " + a.href);
                        }
                    });                  
                });
                c.queue($(".load-more-button a")[0].href);
            } else {
                console.log("Loaded article: " + result.request.uri.href);            
            }
            var articleData = {
                URL: result.request.uri.href,
                author: $("#main_byline > a[rel='author']").text(),
                title: $(".article-header .hed").text(),
                section: $(".print-only + .prop-name > a").text(),
                pubDate: new Date($(".pub-date").text()),
                retDate: new Date,
                links:[],
                paragraphs:[]
            };
        
            $(".text.parbase.section > p").each(function(index,p) {
                articleData.paragraphs.push($(p).text());
            });
            // Join array elements into a string. 
            articleData.fullText = articleData.paragraphs.join(" ");
            
            // Then turn all new lines into spaces (with replace function). 
            articleData.fullText = articleData.fullText.replace(/[\r\n]/," ");
            
            // Then turn all double spaces into single spaces (replace).
            articleData.fullText = articleData.fullText.replace(/\s\s+/," ");
            
            // Then trim off the final space at end.
            articleData.fullText = articleData.fullText.trim(); 
            
            // Then count words with string.split.
            articleData.wordCount = articleData.fullText.split(" ").length;    
            
            // $ is a jQuery instance scoped to the server-side DOM of the page
            $(".body a").each(function(index,a) {
                var text = $(a).text();
                if(text !== "More..." && text !== "Join In" && text !== "" && text !== undefined){
                    articleData.links.push({
                        text: text, 
                        href: a.href,
                        length: text.length
                    });
                }
            });
            
            collection.insert(articleData, {w: 1}, function(err, result) {
                if(err) {
                    console.log("Couldn't save article data.");
                    console.dir(err);
                    process.kill();
                }        
            });
        }
    });
    c.queue("http://www.slate.com/full_slate.60.html");
//    c.queue("http://www.slate.com/articles/double_x/science/2014/03/breast_cancer_patients_should_talk_about_their_sexual_health_just_as_much.html");
//    c.queue("http://www.slate.com/articles/news_and_politics/foreigners/2014/01/pussy_riot_members_after_release_they_re_launching_a_prisoners_rights_movement.single.html");
};

// Connect to the db
MongoClient.connect("mongodb://localhost:27017/slate", function(err, db) {
    if(err) {
        console.log("Couldn't connect.");
        console.dir(err);
        process.kill();
    }
    db.createCollection('articles', function(err, collection) {
        if(err) {
            console.log("Couldn't create articles collection.");
            console.dir(err);
            process.kill();
        }
        setupCrawler(collection);
           
    });
});

// Queue just one URL, with default callback

// archive page: http://www.slate.com/full_slate.html 